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

// GET - Get user's listening history
export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    
    const history = await prisma.listeningHistory.findMany({
      where: { userId: user.id },
      include: { track: true },
      orderBy: { playedAt: 'desc' },
      take: Math.min(limit, 100)
    })
    
    return NextResponse.json({
      success: true,
      history: history.map(h => ({
        id: h.id,
        playedAt: h.playedAt,
        track: h.track
      }))
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

// POST - Add to listening history
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
    
    // Add to history
    const historyEntry = await prisma.listeningHistory.create({
      data: {
        userId: user.id,
        trackId: existingTrack.id
      },
      include: { track: true }
    })
    
    return NextResponse.json({
      success: true,
      history: historyEntry
    })
  } catch (error) {
    console.error('Error adding to history:', error)
    return NextResponse.json(
      { error: 'Failed to add to history' },
      { status: 500 }
    )
  }
}

// DELETE - Clear listening history
export async function DELETE() {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await prisma.listeningHistory.deleteMany({
      where: { userId: user.id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing history:', error)
    return NextResponse.json(
      { error: 'Failed to clear history' },
      { status: 500 }
    )
  }
}
