import { NextRequest, NextResponse } from 'next/server'
import { parseUrl } from '@/lib/url-parser'

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
        { error: 'Invalid URL. Must be a Spotify or YouTube URL' },
        { status: 400 }
      )
    }
    
    let trackData
    
    if (parsed.type === 'YOUTUBE') {
      trackData = await fetchYouTubeMetadata(parsed.id)
    } else if (parsed.type === 'SPOTIFY') {
      trackData = await fetchSpotifyMetadata(parsed.id, parsed.contentType)
    }
    
    return NextResponse.json({
      success: true,
      track: {
        ...trackData,
        sourceType: parsed.type,
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
  // Try to fetch from YouTube oEmbed API (no API key required)
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
  
  // Fallback: Return basic info
  return {
    title: `YouTube Video (${videoId})`,
    artist: 'Unknown',
    album: null,
    duration: null,
    imageUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }
}

async function fetchSpotifyMetadata(id: string, contentType: string) {
  // For Spotify, we would need OAuth token
  // For now, return a placeholder
  // In production, implement Spotify Web API integration
  
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET
  
  if (spotifyClientId && spotifyClientSecret) {
    try {
      // Get access token
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')
        },
        body: 'grant_type=client_credentials'
      })
      
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        const accessToken = tokenData.access_token
        
        // Fetch track/playlist/album data
        const endpoint = contentType === 'track' 
          ? `https://api.spotify.com/v1/tracks/${id}`
          : contentType === 'playlist'
          ? `https://api.spotify.com/v1/playlists/${id}`
          : `https://api.spotify.com/v1/albums/${id}`
        
        const dataResponse = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        
        if (dataResponse.ok) {
          const data = await dataResponse.json()
          
          if (contentType === 'track') {
            return {
              title: data.name,
              artist: data.artists.map((a: { name: string }) => a.name).join(', '),
              album: data.album?.name,
              duration: Math.floor(data.duration_ms / 1000),
              imageUrl: data.album?.images?.[0]?.url
            }
          }
        }
      }
    } catch (error) {
      console.error('Spotify API error:', error)
    }
  }
  
  // Fallback
  return {
    title: `Spotify ${contentType} (${id})`,
    artist: 'Unknown',
    album: null,
    duration: null,
    imageUrl: null
  }
}
