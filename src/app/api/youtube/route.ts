import { NextRequest, NextResponse } from 'next/server';
import {
  extractYouTubeId,
  getYouTubeVideo,
  getYouTubePlaylist,
  searchYouTube,
} from '@/lib/youtube';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const search = searchParams.get('search');

    // Check if YouTube API is configured
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API not configured' },
        { status: 500 }
      );
    }

    // Handle search
    if (search) {
      const maxResults = parseInt(searchParams.get('limit') || '10', 10);
      const results = await searchYouTube(search, Math.min(maxResults, 50));
      return NextResponse.json({ type: 'search', data: results });
    }

    // Handle URL parsing
    if (!url) {
      return NextResponse.json(
        { error: 'URL or search parameter is required' },
        { status: 400 }
      );
    }

    const parsed = extractYouTubeId(url);

    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    let data;

    switch (parsed.type) {
      case 'video':
        data = await getYouTubeVideo(parsed.id);
        return NextResponse.json({ type: 'video', data });

      case 'playlist':
        data = await getYouTubePlaylist(parsed.id);
        return NextResponse.json({ type: 'playlist', data });

      default:
        return NextResponse.json(
          { error: 'Unsupported YouTube content type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('YouTube API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch YouTube data' },
      { status: 500 }
    );
  }
}
