import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Get all public stations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const stations = await prisma.station.findMany({
      where: {
        isPublic: true
      },
      include: {
        queue: {
          where: {
            status: 'PLAYING'
          },
          include: {
            track: true
          },
          take: 1
        },
        _count: {
          select: {
            queue: {
              where: {
                status: 'PENDING'
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })
    
    return NextResponse.json({
      stations,
      total: await prisma.station.count({ where: { isPublic: true } })
    })
  } catch (error) {
    console.error('Error fetching stations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stations' },
      { status: 500 }
    )
  }
}

// Create a new station
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, imageUrl, isPublic } = body
    
    if (!name) {
      return NextResponse.json(
        { error: 'Station name is required' },
        { status: 400 }
      )
    }
    
    const station = await prisma.station.create({
      data: {
        name,
        description: description || null,
        imageUrl: imageUrl || null, // Cover is optional
        isPublic: isPublic ?? true,
        userId: currentUser.userId
      }
    })
    
    return NextResponse.json({
      success: true,
      station
    })
  } catch (error) {
    console.error('Error creating station:', error)
    return NextResponse.json(
      { error: 'Failed to create station' },
      { status: 500 }
    )
  }
}
