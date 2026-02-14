import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Get queue for a station
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params
    
    const queue = await prisma.queueItem.findMany({
      where: { stationId },
      include: {
        track: true
      },
      orderBy: {
        position: 'asc'
      }
    })
    
    return NextResponse.json({ queue })
  } catch (error) {
    console.error('Error fetching queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    )
  }
}

// Add track to queue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params
    const body = await request.json()
    const { trackId, trackData } = body
    
    // Get current queue length for position
    const queueCount = await prisma.queueItem.count({
      where: { stationId }
    })
    
    let track
    
    // If trackId provided, use existing track
    if (trackId) {
      track = await prisma.track.findUnique({
        where: { id: trackId }
      })
      
      if (!track) {
        return NextResponse.json(
          { error: 'Track not found' },
          { status: 404 }
        )
      }
    } else if (trackData) {
      // Create or find track
      track = await prisma.track.upsert({
        where: {
          sourceType_sourceId: {
            sourceType: trackData.sourceType,
            sourceId: trackData.sourceId
          }
        },
        create: {
          title: trackData.title,
          artist: trackData.artist,
          album: trackData.album,
          duration: trackData.duration,
          imageUrl: trackData.imageUrl,
          sourceType: trackData.sourceType,
          sourceId: trackData.sourceId,
          sourceUrl: trackData.sourceUrl
        },
        update: {
          title: trackData.title,
          artist: trackData.artist,
          album: trackData.album,
          duration: trackData.duration,
          imageUrl: trackData.imageUrl
        }
      })

      // Check for duplicate: same track already in this station's queue
      const existing = await prisma.queueItem.findFirst({
        where: { stationId, trackId: track.id }
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Track already in queue' },
          { status: 409 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Either trackId or trackData is required' },
        { status: 400 }
      )
    }
    
    // Add to queue
    const queueItem = await prisma.queueItem.create({
      data: {
        stationId,
        trackId: track.id,
        position: queueCount,
        status: 'PENDING'
      },
      include: {
        track: true
      }
    })
    
    return NextResponse.json({
      success: true,
      queueItem
    })
  } catch (error) {
    console.error('Error adding to queue:', error)
    return NextResponse.json(
      { error: 'Failed to add to queue' },
      { status: 500 }
    )
  }
}

// Reorder queue
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params
    const body = await request.json()
    const { itemId, newPosition, action } = body
    
    // Go On Air: reset all items to PENDING, mark first as PLAYING, set station live
    if (action === 'go-live') {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Reset all queue items to PENDING
        await tx.queueItem.updateMany({
          where: { stationId },
          data: { status: 'PENDING' }
        })

        // Mark first item as PLAYING
        const firstItem = await tx.queueItem.findFirst({
          where: { stationId, status: 'PENDING' },
          orderBy: { position: 'asc' },
          include: { track: true }
        })

        if (firstItem) {
          await tx.queueItem.update({
            where: { id: firstItem.id },
            data: { status: 'PLAYING' }
          })
        }

        // Set station as live with timestamp
        await tx.station.update({
          where: { id: stationId },
          data: { isLive: true, liveStartedAt: new Date(), currentPosition: 0 }
        })
      })

      // Get updated queue to return
      const updatedQueue = await prisma.queueItem.findMany({
        where: { stationId },
        include: { track: true },
        orderBy: { position: 'asc' }
      })

      return NextResponse.json({ success: true, queue: updatedQueue })
    }

    // Go Off Air: set station offline
    if (action === 'go-offline') {
      await prisma.station.update({
        where: { id: stationId },
        data: { isLive: false, liveStartedAt: null, currentPosition: 0 }
      })
      return NextResponse.json({ success: true })
    }

    // Sync playback position (DJ reports current time periodically)
    if (action === 'sync-position' && body.position !== undefined) {
      await prisma.station.update({
        where: { id: stationId },
        data: { currentPosition: Math.floor(body.position) }
      })
      return NextResponse.json({ success: true })
    }

    // Sync current playing track (called from client when a specific track starts)
    if (action === 'sync-playing' && itemId) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Mark ALL items before this one as PLAYED, this one as PLAYING, rest stay PENDING
        const allItems = await tx.queueItem.findMany({
          where: { stationId },
          orderBy: { position: 'asc' }
        })

        const targetIndex = allItems.findIndex(i => i.id === itemId)
        if (targetIndex === -1) return

        for (let i = 0; i < allItems.length; i++) {
          const newStatus = i < targetIndex ? 'PLAYED' : i === targetIndex ? 'PLAYING' : 'PENDING'
          if (allItems[i].status !== newStatus) {
            await tx.queueItem.update({
              where: { id: allItems[i].id },
              data: { status: newStatus }
            })
          }
        }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'play-next') {
      // Mark current playing as played, and set next as playing
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Mark current as played
        await tx.queueItem.updateMany({
          where: {
            stationId,
            status: 'PLAYING'
          },
          data: {
            status: 'PLAYED'
          }
        })
        
        // Get next pending
        const nextItem = await tx.queueItem.findFirst({
          where: {
            stationId,
            status: 'PENDING'
          },
          orderBy: {
            position: 'asc'
          }
        })
        
        if (nextItem) {
          await tx.queueItem.update({
            where: { id: nextItem.id },
            data: { status: 'PLAYING' }
          })
        }
      })
      
      return NextResponse.json({ success: true })
    }
    
    if (action === 'skip') {
      await prisma.queueItem.update({
        where: { id: itemId },
        data: { status: 'SKIPPED' }
      })
      
      return NextResponse.json({ success: true })
    }
    
    // Reorder
    if (itemId && newPosition !== undefined) {
      const items = await prisma.queueItem.findMany({
        where: { stationId },
        orderBy: { position: 'asc' }
      })
      
      const currentIndex = items.findIndex(item => item.id === itemId)
      if (currentIndex === -1) {
        return NextResponse.json(
          { error: 'Item not found in queue' },
          { status: 404 }
        )
      }
      
      // Remove and reinsert
      const [movedItem] = items.splice(currentIndex, 1)
      items.splice(newPosition, 0, movedItem)
      
      // Update all positions
      await prisma.$transaction(
        items.map((item, index) =>
          prisma.queueItem.update({
            where: { id: item.id },
            data: { position: index }
          })
        )
      )
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json(
      { error: 'Invalid action or parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating queue:', error)
    return NextResponse.json(
      { error: 'Failed to update queue' },
      { status: 500 }
    )
  }
}

// Remove from queue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params
    const { searchParams } = new URL(request.url)
    const clearAll = searchParams.get('clearAll')
    
    if (clearAll === 'true') {
      await prisma.queueItem.deleteMany({
        where: { stationId }
      })
      return NextResponse.json({ success: true })
    }
    
    // Support both query param and body
    let itemId = searchParams.get('itemId')
    if (!itemId) {
      try {
        const body = await request.json()
        itemId = body.queueItemId || body.itemId
      } catch {}
    }
    
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }
    
    await prisma.queueItem.delete({
      where: { id: itemId }
    })
    
    // Reorder remaining items
    const items = await prisma.queueItem.findMany({
      where: { stationId },
      orderBy: { position: 'asc' }
    })
    
    await prisma.$transaction(
      items.map((item, index) =>
        prisma.queueItem.update({
          where: { id: item.id },
          data: { position: index }
        })
      )
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from queue:', error)
    return NextResponse.json(
      { error: 'Failed to remove from queue' },
      { status: 500 }
    )
  }
}
