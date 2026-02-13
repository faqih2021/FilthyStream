import { NextRequest, NextResponse } from 'next/server';
import {
  extractSpotifyId,
  getSpotifyTrack,
  getSpotifyPlaylist,
  getSpotifyAlbum,
} from '@/lib/spotify';

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

    // Check if Spotify credentials are configured
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Spotify API not configured' },
        { status: 500 }
      );
    }

    const parsed = extractSpotifyId(url);

    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid Spotify URL' },
        { status: 400 }
      );
    }

    let data;

    switch (parsed.type) {
      case 'track':
        data = await getSpotifyTrack(parsed.id);
        return NextResponse.json({ type: 'track', data });

      case 'playlist':
        data = await getSpotifyPlaylist(parsed.id);
        return NextResponse.json({ type: 'playlist', data });

      case 'album':
        data = await getSpotifyAlbum(parsed.id);
        return NextResponse.json({ type: 'album', data });

      default:
        return NextResponse.json(
          { error: 'Unsupported Spotify content type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Spotify API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Spotify data' },
      { status: 500 }
    );
  }
}
