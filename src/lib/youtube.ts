// YouTube Data API v3 utilities for fetching playlist and video metadata

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

interface YouTubeThumbnails {
  default?: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
}

interface YouTubePlaylistItem {
  snippet: {
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    resourceId: {
      videoId: string;
    };
  };
  contentDetails: {
    videoId: string;
  };
}

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
  };
  contentDetails: {
    duration: string; // ISO 8601 format
  };
}

export interface ParsedYouTubeVideo {
  id: string;
  title: string;
  channel: string;
  duration: number; // in seconds
  durationFormatted: string;
  image: string | null;
  youtubeUrl: string;
}

export interface ParsedYouTubePlaylist {
  id: string;
  name: string;
  description: string;
  image: string | null;
  channel: string;
  totalVideos: number;
  videos: ParsedYouTubeVideo[];
  youtubeUrl: string;
}

/**
 * Parse ISO 8601 duration to seconds
 * Examples: PT1H2M3S, PT5M30S, PT45S
 */
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format seconds to mm:ss or hh:mm:ss
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get best available thumbnail
 */
function getBestThumbnail(thumbnails: YouTubeThumbnails): string | null {
  return thumbnails.maxres?.url 
    || thumbnails.standard?.url 
    || thumbnails.high?.url 
    || thumbnails.medium?.url 
    || thumbnails.default?.url 
    || null;
}

/**
 * Extract YouTube ID from URL or return as-is if already an ID
 */
export function extractYouTubeId(input: string): { type: 'video' | 'playlist'; id: string } | null {
  // Playlist URL patterns
  const playlistMatch = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch) {
    return { type: 'playlist', id: playlistMatch[1] };
  }

  // Video URL patterns
  // youtube.com/watch?v=xxx
  const watchMatch = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    return { type: 'video', id: watchMatch[1] };
  }

  // youtu.be/xxx
  const shortMatch = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) {
    return { type: 'video', id: shortMatch[1] };
  }

  // youtube.com/embed/xxx
  const embedMatch = input.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) {
    return { type: 'video', id: embedMatch[1] };
  }

  // Check if it's just an ID (11 characters for video, variable for playlist)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return { type: 'video', id: input };
  }

  if (/^PL[a-zA-Z0-9_-]+$/.test(input)) {
    return { type: 'playlist', id: input };
  }

  return null;
}

/**
 * Get single video metadata
 */
export async function getYouTubeVideo(videoId: string): Promise<ParsedYouTubeVideo> {
  const url = `${BASE_URL}/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found');
  }

  const video: YouTubeVideo = data.items[0];
  const durationSeconds = parseISO8601Duration(video.contentDetails.duration);

  return {
    id: video.id,
    title: video.snippet.title,
    channel: video.snippet.channelTitle,
    duration: durationSeconds,
    durationFormatted: formatDuration(durationSeconds),
    image: getBestThumbnail(video.snippet.thumbnails),
    youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
  };
}

/**
 * Get playlist metadata with all videos
 */
export async function getYouTubePlaylist(playlistId: string): Promise<ParsedYouTubePlaylist> {
  // Get playlist info
  const playlistUrl = `${BASE_URL}/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YOUTUBE_API_KEY}`;
  const playlistResponse = await fetch(playlistUrl);
  
  if (!playlistResponse.ok) {
    throw new Error(`Failed to fetch playlist: ${playlistResponse.statusText}`);
  }

  const playlistData = await playlistResponse.json();
  
  if (!playlistData.items || playlistData.items.length === 0) {
    throw new Error('Playlist not found');
  }

  const playlist = playlistData.items[0];
  
  // Fetch all playlist items (handle pagination)
  const videoIds: string[] = [];
  let nextPageToken: string | undefined;

  do {
    const itemsUrl = `${BASE_URL}/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ''}&key=${YOUTUBE_API_KEY}`;
    const itemsResponse = await fetch(itemsUrl);
    
    if (!itemsResponse.ok) break;
    
    const itemsData = await itemsResponse.json();
    
    for (const item of itemsData.items as YouTubePlaylistItem[]) {
      if (item.contentDetails?.videoId) {
        videoIds.push(item.contentDetails.videoId);
      }
    }
    
    nextPageToken = itemsData.nextPageToken;
  } while (nextPageToken);

  // Fetch video details in batches of 50
  const videos: ParsedYouTubeVideo[] = [];
  
  for (let i = 0; i < videoIds.length; i += 50) {
    const batchIds = videoIds.slice(i, i + 50);
    const videosUrl = `${BASE_URL}/videos?part=snippet,contentDetails&id=${batchIds.join(',')}&key=${YOUTUBE_API_KEY}`;
    const videosResponse = await fetch(videosUrl);
    
    if (!videosResponse.ok) continue;
    
    const videosData = await videosResponse.json();
    
    for (const video of videosData.items as YouTubeVideo[]) {
      const durationSeconds = parseISO8601Duration(video.contentDetails.duration);
      videos.push({
        id: video.id,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        duration: durationSeconds,
        durationFormatted: formatDuration(durationSeconds),
        image: getBestThumbnail(video.snippet.thumbnails),
        youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
      });
    }
  }

  return {
    id: playlist.id,
    name: playlist.snippet.title,
    description: playlist.snippet.description || '',
    image: getBestThumbnail(playlist.snippet.thumbnails),
    channel: playlist.snippet.channelTitle,
    totalVideos: playlist.contentDetails.itemCount,
    videos,
    youtubeUrl: `https://www.youtube.com/playlist?list=${playlist.id}`,
  };
}

/**
 * Search videos on YouTube
 */
export async function searchYouTube(query: string, maxResults: number = 10): Promise<ParsedYouTubeVideo[]> {
  const searchUrl = `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
  const searchResponse = await fetch(searchUrl);
  
  if (!searchResponse.ok) {
    throw new Error(`Failed to search: ${searchResponse.statusText}`);
  }

  const searchData = await searchResponse.json();
  const videoIds = searchData.items.map((item: { id: { videoId: string } }) => item.id.videoId);
  
  if (videoIds.length === 0) {
    return [];
  }

  // Get full video details
  const videosUrl = `${BASE_URL}/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
  const videosResponse = await fetch(videosUrl);
  
  if (!videosResponse.ok) {
    throw new Error(`Failed to fetch video details: ${videosResponse.statusText}`);
  }

  const videosData = await videosResponse.json();
  
  return videosData.items.map((video: YouTubeVideo) => {
    const durationSeconds = parseISO8601Duration(video.contentDetails.duration);
    return {
      id: video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      duration: durationSeconds,
      durationFormatted: formatDuration(durationSeconds),
      image: getBestThumbnail(video.snippet.thumbnails),
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
    };
  });
}
