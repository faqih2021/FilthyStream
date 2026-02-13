import { NextRequest, NextResponse } from 'next/server'
import { parseUrl } from '@/lib/url-parser'
import { getYouTubeVideo } from '@/lib/youtube'

// Fetch track metadata from URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }
    
    const parsed = parseUrl(url)
    
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid URL. Must be a YouTube URL' },
        { status: 400 }
      )
    }
    
    const trackData = await fetchYouTubeMetadata(parsed.id)
    
    return NextResponse.json({
      success: true,
      track: {
        ...trackData,
        sourceType: 'YOUTUBE',
        sourceId: parsed.id,
        sourceUrl: url
      }
    })
  } catch (error) {
    console.error('Error fetching track:', error)
    return NextResponse.json(
      { error: 'Failed to fetch track metadata' },
      { status: 500 }
    )
  }
}

async function fetchYouTubeMetadata(videoId: string) {
  // Try YouTube Data API first (requires API key)
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const video = await getYouTubeVideo(videoId)
      return {
        title: video.title,
        artist: video.channel,
        album: null,
        duration: video.duration,
        imageUrl: video.image
      }
    } catch (error) {
      console.error('YouTube API error:', error)
    }
  }
  
  // Fallback: Try oEmbed API (no API key required)
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    
    if (response.ok) {
      const data = await response.json()
      return {
        title: data.title,
        artist: data.author_name,
        album: null,
        duration: null, // oEmbed doesn't provide duration
        imageUrl: data.thumbnail_url
      }
    }
  } catch (error) {
    console.error('YouTube oEmbed error:', error)
  }
  
  // Final fallback: Return basic info
  return {
    title: `YouTube Video (${videoId})`,
    artist: 'Unknown',
    album: null,
    duration: null,
    imageUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }
}
