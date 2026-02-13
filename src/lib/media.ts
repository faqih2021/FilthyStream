// Unified media service for handling Spotify and YouTube URLs

import { extractSpotifyId, type ParsedSpotifyTrack, type ParsedSpotifyPlaylist } from './spotify';
import { extractYouTubeId, type ParsedYouTubeVideo, type ParsedYouTubePlaylist } from './youtube';

export type MediaSource = 'spotify' | 'youtube' | 'unknown';

export interface UnifiedTrack {
  id: string;
  title: string;
  artist: string; // or channel for YouTube
  duration: number;
  durationFormatted: string;
  image: string | null;
  source: MediaSource;
  sourceUrl: string;
  sourceId: string; // Original Spotify/YouTube ID
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
  if (url.includes('spotify.com') || url.startsWith('spotify:')) {
    return 'spotify';
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  return 'unknown';
}

/**
 * Convert Spotify track to unified format
 */
export function spotifyTrackToUnified(track: ParsedSpotifyTrack): UnifiedTrack {
  return {
    id: `spotify:${track.id}`,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    durationFormatted: track.durationFormatted,
    image: track.image,
    source: 'spotify',
    sourceUrl: track.spotifyUrl,
    sourceId: track.id,
  };
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
 * Convert Spotify playlist to unified format
 */
export function spotifyPlaylistToUnified(playlist: ParsedSpotifyPlaylist): UnifiedPlaylist {
  return {
    id: `spotify:playlist:${playlist.id}`,
    name: playlist.name,
    description: playlist.description,
    image: playlist.image,
    owner: playlist.owner,
    totalTracks: playlist.totalTracks,
    tracks: playlist.tracks.map(spotifyTrackToUnified),
    source: 'spotify',
    sourceUrl: playlist.spotifyUrl,
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
  type: 'track' | 'video' | 'playlist' | 'album' | null;
  id: string | null;
} {
  const source = detectMediaSource(url);

  if (source === 'spotify') {
    const parsed = extractSpotifyId(url);
    if (parsed) {
      return {
        source,
        type: parsed.type,
        id: parsed.id,
      };
    }
  }

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
