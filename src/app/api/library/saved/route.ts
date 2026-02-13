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

// GET - Get user's saved tracks
export async function GET() {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const savedTracks = await prisma.savedTrack.findMany({
      where: { userId: user.id },
      include: { track: true },
      orderBy: { savedAt: 'desc' }
    })
    
    return NextResponse.json({
      success: true,
      tracks: savedTracks.map(st => ({
        id: st.id,
        savedAt: st.savedAt,
        track: st.track
      }))
    })
  } catch (error) {
    console.error('Error fetching saved tracks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved tracks' },
      { status: 500 }
    )
  }
}

// POST - Save a track
export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { trackId, track } = body
    
    let existingTrack
    
    // If trackId is provided, use it directly
    if (trackId) {
      existingTrack = await prisma.track.findUnique({
        where: { id: trackId }
      })
    }
    
    // If track data is provided, find or create the track
    if (!existingTrack && track) {
      existingTrack = await prisma.track.findFirst({
        where: {
          sourceType: track.sourceType,
          sourceId: track.sourceId
        }
      })
      
      if (!existingTrack) {
        existingTrack = await prisma.track.create({
          data: {
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            imageUrl: track.imageUrl,
            sourceType: track.sourceType,
            sourceId: track.sourceId,
            sourceUrl: track.sourceUrl
          }
        })
      }
    }
    
    if (!existingTrack) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      )
    }
    
    // Save the track
    const savedTrack = await prisma.savedTrack.upsert({
      where: {
        userId_trackId: {
          userId: user.id,
          trackId: existingTrack.id
        }
      },
      create: {
        userId: user.id,
        trackId: existingTrack.id
      },
      update: {},
      include: { track: true }
    })
    
    return NextResponse.json({
      success: true,
      savedTrack
    })
  } catch (error) {
    console.error('Error saving track:', error)
    return NextResponse.json(
      { error: 'Failed to save track' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a saved track
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }
    
    // Verify ownership and delete
    const savedTrack = await prisma.savedTrack.findFirst({
      where: {
        id,
        userId: user.id
      }
    })
    
    if (!savedTrack) {
      return NextResponse.json(
        { error: 'Saved track not found' },
        { status: 404 }
      )
    }
    
    await prisma.savedTrack.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing saved track:', error)
    return NextResponse.json(
      { error: 'Failed to remove saved track' },
      { status: 500 }
    )
  }
}
