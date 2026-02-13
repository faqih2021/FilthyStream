import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: Promise<{ id: string }>;
}

// Increment play count for a station
export async function POST(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;

    const station = await prisma.station.update({
      where: { id },
      data: {
        playCount: {
          increment: 1
        }
      }
    });

    return NextResponse.json({
      success: true,
      playCount: station.playCount
    });
  } catch (error) {
    console.error('Error incrementing play count:', error);
    return NextResponse.json(
      { error: 'Failed to track play' },
      { status: 500 }
    );
  }
}
