import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get station by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        queue: {
          include: {
            track: true
          },
          orderBy: {
            position: 'asc'
          }
        },
        history: {
          include: {
            track: true
          },
          orderBy: {
            playedAt: 'desc'
          },
          take: 20
        }
      }
    })
    
    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ station })
  } catch (error) {
    console.error('Error fetching station:', error)
    return NextResponse.json(
      { error: 'Failed to fetch station' },
      { status: 500 }
    )
  }
}

// Update station
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, imageUrl, isPublic, isLive } = body
    
    const station = await prisma.station.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isPublic !== undefined && { isPublic }),
        ...(isLive !== undefined && { isLive })
      }
    })
    
    return NextResponse.json({ station })
  } catch (error) {
    console.error('Error updating station:', error)
    return NextResponse.json(
      { error: 'Failed to update station' },
      { status: 500 }
    )
  }
}

// Delete station
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await prisma.station.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting station:', error)
    return NextResponse.json(
      { error: 'Failed to delete station' },
      { status: 500 }
    )
  }
}
