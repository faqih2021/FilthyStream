import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET - Get all tracks in a playlist
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const playlist = await prisma.playlist.findFirst({
      where: { id, userId: user.id },
      include: {
        tracks: {
          include: { track: true },
          orderBy: { position: 'asc' }
        }
      }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        imageUrl: playlist.imageUrl,
        isPublic: playlist.isPublic,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        tracks: playlist.tracks.map(pt => ({
          playlistTrackId: pt.id,
          position: pt.position,
          addedAt: pt.addedAt,
          ...pt.track
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching playlist tracks:', error)
    return NextResponse.json({ error: 'Failed to fetch playlist tracks' }, { status: 500 })
  }
}

// POST - Add a track to a playlist (by YouTube URL or track ID)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { trackId, youtubeUrl } = body

    // Verify playlist ownership
    const playlist = await prisma.playlist.findFirst({
      where: { id, userId: user.id },
      include: { tracks: true }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    let track

    if (trackId) {
      // Adding existing track by ID
      track = await prisma.track.findUnique({ where: { id: trackId } })
      if (!track) {
        return NextResponse.json({ error: 'Track not found' }, { status: 404 })
      }
    } else if (youtubeUrl) {
      // Adding by YouTube URL - extract video ID and fetch metadata
      const videoId = extractYouTubeId(youtubeUrl)
      if (!videoId) {
        return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
      }

      // Check if track already exists in DB
      track = await prisma.track.findUnique({
        where: { sourceType_sourceId: { sourceType: 'YOUTUBE', sourceId: videoId } }
      })

      if (!track) {
        // Fetch metadata from YouTube oEmbed API
        const metadata = await fetchYouTubeMetadata(videoId)
        
        track = await prisma.track.create({
          data: {
            title: metadata.title || 'Unknown Title',
            artist: metadata.author || null,
            sourceType: 'YOUTUBE',
            sourceId: videoId,
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
            imageUrl: metadata.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          }
        })
      }
    } else {
      return NextResponse.json({ error: 'trackId or youtubeUrl is required' }, { status: 400 })
    }

    // Check if track already in playlist
    const existing = await prisma.playlistTrack.findUnique({
      where: { playlistId_trackId: { playlistId: id, trackId: track.id } }
    })

    if (existing) {
      return NextResponse.json({ error: 'Track already in playlist' }, { status: 409 })
    }

    // Add to playlist at the end
    const nextPosition = playlist.tracks.length
    const playlistTrack = await prisma.playlistTrack.create({
      data: {
        playlistId: id,
        trackId: track.id,
        position: nextPosition
      },
      include: { track: true }
    })

    return NextResponse.json({
      success: true,
      track: {
        playlistTrackId: playlistTrack.id,
        position: playlistTrack.position,
        addedAt: playlistTrack.addedAt,
        ...playlistTrack.track
      }
    })
  } catch (error) {
    console.error('Error adding track to playlist:', error)
    return NextResponse.json({ error: 'Failed to add track to playlist' }, { status: 500 })
  }
}

// DELETE - Remove a track from a playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')

    if (!trackId) {
      return NextResponse.json({ error: 'trackId is required' }, { status: 400 })
    }

    // Verify playlist ownership
    const playlist = await prisma.playlist.findFirst({
      where: { id, userId: user.id }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Delete the playlist track
    await prisma.playlistTrack.delete({
      where: { playlistId_trackId: { playlistId: id, trackId } }
    })

    // Reorder remaining tracks
    const remaining = await prisma.playlistTrack.findMany({
      where: { playlistId: id },
      orderBy: { position: 'asc' }
    })

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i) {
        await prisma.playlistTrack.update({
          where: { id: remaining[i].id },
          data: { position: i }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing track from playlist:', error)
    return NextResponse.json({ error: 'Failed to remove track from playlist' }, { status: 500 })
  }
}

// Helper: Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/ // Just the ID
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Helper: Fetch YouTube metadata via oEmbed
async function fetchYouTubeMetadata(videoId: string) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    if (res.ok) {
      const data = await res.json()
      return {
        title: data.title,
        author: data.author_name,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  } catch (e) {
    console.warn('Failed to fetch YouTube metadata:', e)
  }
  
  return {
    title: 'Unknown Title',
    author: null,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  }
}
