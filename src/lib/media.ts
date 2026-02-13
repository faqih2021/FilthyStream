// Unified media service for handling YouTube URLs

import { extractYouTubeId, type ParsedYouTubeVideo, type ParsedYouTubePlaylist } from './youtube';

export type MediaSource = 'youtube' | 'unknown';

export interface UnifiedTrack {
  id: string;
  title: string;
  artist: string; // channel for YouTube
  duration: number;
  durationFormatted: string;
  image: string | null;
  source: MediaSource;
  sourceUrl: string;
  sourceId: string; // YouTube video ID
}

export interface UnifiedPlaylist {
  id: string;
  name: string;
  description: string;
  image: string | null;
  owner: string;
  totalTracks: number;
  tracks: UnifiedTrack[];
  source: MediaSource;
  sourceUrl: string;
}

/**
 * Detect media source from URL
 */
export function detectMediaSource(url: string): MediaSource {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  return 'unknown';
}

/**
 * Convert YouTube video to unified format
 */
export function youtubeVideoToUnified(video: ParsedYouTubeVideo): UnifiedTrack {
  return {
    id: `youtube:${video.id}`,
    title: video.title,
    artist: video.channel,
    duration: video.duration,
    durationFormatted: video.durationFormatted,
    image: video.image,
    source: 'youtube',
    sourceUrl: video.youtubeUrl,
    sourceId: video.id,
  };
}

/**
 * Convert YouTube playlist to unified format
 */
export function youtubePlaylistToUnified(playlist: ParsedYouTubePlaylist): UnifiedPlaylist {
  return {
    id: `youtube:playlist:${playlist.id}`,
    name: playlist.name,
    description: playlist.description,
    image: playlist.image,
    owner: playlist.channel,
    totalTracks: playlist.totalVideos,
    tracks: playlist.videos.map(youtubeVideoToUnified),
    source: 'youtube',
    sourceUrl: playlist.youtubeUrl,
  };
}

/**
 * Parse any media URL and return structured info
 */
export function parseMediaUrl(url: string): {
  source: MediaSource;
  type: 'video' | 'playlist' | null;
  id: string | null;
} {
  const source = detectMediaSource(url);

  if (source === 'youtube') {
    const parsed = extractYouTubeId(url);
    if (parsed) {
      return {
        source,
        type: parsed.type,
        id: parsed.id,
      };
    }
  }

  return { source: 'unknown', type: null, id: null };
}
