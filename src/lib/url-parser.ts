// Utility functions for parsing YouTube URLs

export interface ParsedUrl {
  type: 'YOUTUBE'
  id: string
  contentType: 'video' | 'playlist'
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
 * Parse any supported URL (YouTube only)
 */
export function parseUrl(url: string): ParsedUrl | null {
  const trimmedUrl = url.trim()
  return parseYoutubeUrl(trimmedUrl)
}

/**
 * Check if URL is valid YouTube URL
 */
export function isValidUrl(url: string): boolean {
  return parseUrl(url) !== null
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
