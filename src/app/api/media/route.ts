import { NextRequest, NextResponse } from 'next/server';
import { 
  detectMediaSource, 
  parseMediaUrl,
  youtubeVideoToUnified,
  youtubePlaylistToUnified,
} from '@/lib/media';
import { getYouTubeVideo, getYouTubePlaylist } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    const parsed = parseMediaUrl(url);

    if (parsed.source === 'unknown' || !parsed.type || !parsed.id) {
      return NextResponse.json(
        { error: 'Could not parse URL. Supported: YouTube (video/playlist)' },
        { status: 400 }
      );
    }

    // Handle YouTube
    if (parsed.source === 'youtube') {
      if (!process.env.YOUTUBE_API_KEY) {
        return NextResponse.json(
          { error: 'YouTube API not configured' },
          { status: 500 }
        );
      }

      if (parsed.type === 'video') {
        const video = await getYouTubeVideo(parsed.id);
        return NextResponse.json({
          source: 'youtube',
          type: 'video',
          data: youtubeVideoToUnified(video),
        });
      }

      if (parsed.type === 'playlist') {
        const playlist = await getYouTubePlaylist(parsed.id);
        return NextResponse.json({
          source: 'youtube',
          type: 'playlist',
          data: youtubePlaylistToUnified(playlist),
        });
      }
    }

    return NextResponse.json(
      { error: 'Unsupported content type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Media API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch media data' },
      { status: 500 }
    );
  }
}
