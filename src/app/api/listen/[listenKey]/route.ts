import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get station by listen key (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listenKey: string }> }
) {
  try {
    const { listenKey } = await params
    
    const station = await prisma.station.findUnique({
      where: { listenKey },
      include: {
        queue: {
          where: {
            status: {
              in: ['PLAYING', 'PENDING']
            }
          },
          include: {
            track: true
          },
          orderBy: {
            position: 'asc'
          }
        }
      }
    })
    
    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      )
    }
    
    // Increment play count
    await prisma.station.update({
      where: { id: station.id },
      data: {
        playCount: { increment: 1 }
      }
    })
    
    // Return station info (hide sensitive data)
    return NextResponse.json({
      station: {
        id: station.id,
        name: station.name,
        description: station.description,
        imageUrl: station.imageUrl,
        isLive: station.isLive,
        listenKey: station.listenKey,
        listenerCount: station.listenerCount,
        currentTrack: station.queue.find(q => q.status === 'PLAYING')?.track || null,
        upNext: station.queue.filter(q => q.status === 'PENDING').slice(0, 5).map(q => q.track)
      }
    })
  } catch (error) {
    console.error('Error fetching station by listen key:', error)
    return NextResponse.json(
      { error: 'Failed to fetch station' },
      { status: 500 }
    )
  }
}
