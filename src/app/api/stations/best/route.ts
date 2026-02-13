import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Get best played stations (sorted by play count)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
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
        }
      },
      orderBy: {
        playCount: 'desc'
      },
      take: limit
    });

    return NextResponse.json({ stations });
  } catch (error) {
    console.error('Error fetching best stations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch best stations' },
      { status: 500 }
    );
  }
}
