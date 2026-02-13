// Utility functions for parsing Spotify and YouTube URLs

export interface ParsedUrl {
  type: 'SPOTIFY' | 'YOUTUBE'
  id: string
  contentType: 'track' | 'playlist' | 'album' | 'video'
}

/**
 * Parse Spotify URL and extract track/playlist/album ID
 * Supports formats:
 * - https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6
 * - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 * - https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX
 * - spotify:track:6rqhFgbbKwnb9MLmUQDhG6
 */
export function parseSpotifyUrl(url: string): ParsedUrl | null {
  // Handle Spotify URI format
  const uriMatch = url.match(/^spotify:(track|playlist|album):([a-zA-Z0-9]+)$/)
  if (uriMatch) {
    return {
      type: 'SPOTIFY',
      id: uriMatch[2],
      contentType: uriMatch[1] as 'track' | 'playlist' | 'album'
    }
  }
  
  // Handle Spotify URL format
  const urlMatch = url.match(/^https?:\/\/open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)(\?.*)?$/)
  if (urlMatch) {
    return {
      type: 'SPOTIFY',
      id: urlMatch[2],
      contentType: urlMatch[1] as 'track' | 'playlist' | 'album'
    }
  }
  
  return null
}

/**
 * Parse YouTube URL and extract video/playlist ID
 * Supports formats:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf
 * - https://youtube.com/shorts/dQw4w9WgXcQ
 * - https://music.youtube.com/watch?v=dQw4w9WgXcQ
 */
export function parseYoutubeUrl(url: string): ParsedUrl | null {
  // Handle youtu.be format
  const shortMatch = url.match(/^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)(\?.*)?$/)
  if (shortMatch) {
    return {
      type: 'YOUTUBE',
      id: shortMatch[1],
      contentType: 'video'
    }
  }
  
  // Handle youtube.com/watch format
  const watchMatch = url.match(/^https?:\/\/(www\.|music\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)(&.*)?$/)
  if (watchMatch) {
    return {
      type: 'YOUTUBE',
      id: watchMatch[2],
      contentType: 'video'
    }
  }
  
  // Handle youtube.com/shorts format
  const shortsMatch = url.match(/^https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)(\?.*)?$/)
  if (shortsMatch) {
    return {
      type: 'YOUTUBE',
      id: shortsMatch[2],
      contentType: 'video'
    }
  }
  
  // Handle playlist format
  const playlistMatch = url.match(/^https?:\/\/(www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)(&.*)?$/)
  if (playlistMatch) {
    return {
      type: 'YOUTUBE',
      id: playlistMatch[2],
      contentType: 'playlist'
    }
  }
  
  // Handle video in playlist format (extract video ID)
  const videoInPlaylistMatch = url.match(/^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]+)/)
  if (videoInPlaylistMatch) {
    return {
      type: 'YOUTUBE',
      id: videoInPlaylistMatch[2],
      contentType: 'video'
    }
  }
  
  return null
}

/**
 * Parse any supported URL (Spotify or YouTube)
 */
export function parseUrl(url: string): ParsedUrl | null {
  const trimmedUrl = url.trim()
  
  // Try Spotify first
  const spotifyResult = parseSpotifyUrl(trimmedUrl)
  if (spotifyResult) return spotifyResult
  
  // Try YouTube
  const youtubeResult = parseYoutubeUrl(trimmedUrl)
  if (youtubeResult) return youtubeResult
  
  return null
}

/**
 * Check if URL is valid Spotify or YouTube URL
 */
export function isValidUrl(url: string): boolean {
  return parseUrl(url) !== null
}

/**
 * Get platform name from URL
 */
export function getPlatformFromUrl(url: string): 'spotify' | 'youtube' | null {
  const parsed = parseUrl(url)
  if (!parsed) return null
  return parsed.type.toLowerCase() as 'spotify' | 'youtube'
}

/**
 * Format duration from seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '0:00'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
