import { NextRequest } from 'next/server'
import ytdl from '@distube/ytdl-core'
import { prisma } from '@/lib/prisma'
import { getStationPlayState, advanceToNextTrack } from '@/lib/stream-manager'

// Disable body parsing for streaming
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max (Vercel Pro)

/**
 * Audio streaming endpoint
 * 
 * This is the "radio stream" URL - like https://stream.zeno.fm/xyz
 * Listeners connect here and receive a continuous audio stream.
 * 
 * Works in browsers, VLC, car radios, etc.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listenKey: string }> }
) {
  const { listenKey } = await params

  // Find station by listen key
  const station = await prisma.station.findUnique({
    where: { listenKey },
    include: {
      queue: {
        include: { track: true },
        orderBy: { position: 'asc' }
      }
    }
  })

  if (!station) {
    return new Response('Station not found', { status: 404 })
  }

  // Get current play state
  let playState = await getStationPlayState(station.id)
  
  if (!playState || !playState.currentTrackSourceId) {
    // Try to start playing
    playState = await advanceToNextTrack(station.id)
  }

  if (!playState || !playState.currentTrackSourceId) {
    return new Response('No tracks in queue', { status: 204 })
  }

  const videoId = playState.currentTrackSourceId

  // Increment listener count
  await prisma.station.update({
    where: { id: station.id },
    data: { playCount: { increment: 1 } }
  })

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Get audio stream info
    const info = await ytdl.getInfo(videoUrl)
    
    // Pick best audio-only format
    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly'
    })

    if (!audioFormat || !audioFormat.url) {
      // Advance to next track if this one fails
      await advanceToNextTrack(station.id)
      return new Response('Failed to get audio stream, advancing to next track', { status: 502 })
    }

    // Calculate seek position if track already started
    let seekSeconds = 0
    if (playState.currentTrackStartedAt) {
      seekSeconds = Math.floor((Date.now() - playState.currentTrackStartedAt) / 1000)
    }

    // Create the YouTube audio stream
    const audioStream = ytdl(videoUrl, {
      format: audioFormat,
      begin: seekSeconds > 5 ? `${seekSeconds}s` : undefined
    })

    // Determine content type
    const mimeType = audioFormat.mimeType?.split(';')[0] || 'audio/webm'

    // Create a ReadableStream from the Node.js stream
    const readable = new ReadableStream({
      start(controller) {
        audioStream.on('data', (chunk: Buffer) => {
          try {
            controller.enqueue(new Uint8Array(chunk))
          } catch {
            // Controller might be closed
            audioStream.destroy()
          }
        })

        audioStream.on('end', () => {
          try {
            controller.close()
          } catch {
            // Already closed
          }
          // Advance to next track
          advanceToNextTrack(station.id)
        })

        audioStream.on('error', (err) => {
          console.error('Stream error:', err)
          try {
            controller.close()
          } catch {
            // Already closed
          }
          // Advance to next track on error
          advanceToNextTrack(station.id)
        })

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          audioStream.destroy()
        })
      },
      cancel() {
        audioStream.destroy()
      }
    })

    // Get station name for ICY metadata
    const stationName = station.name
    const currentTrack = station.queue.find(q => q.track.sourceId === videoId)
    const trackTitle = currentTrack?.track.title || 'Unknown'
    const trackArtist = currentTrack?.track.artist || 'Unknown'

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        // ICY metadata headers (for media players)
        'icy-name': stationName,
        'icy-description': station.description || '',
        'icy-genre': 'Various',
        'icy-url': `${request.nextUrl.origin}/listen/${listenKey}`,
        'icy-br': String(audioFormat.audioBitrate || 128),
        'icy-sr': String(audioFormat.audioSampleRate || 44100),
        // Track info
        'x-now-playing': `${trackArtist} - ${trackTitle}`,
      }
    })
  } catch (error) {
    console.error('Stream error:', error)
    // Advance to next track on any error
    await advanceToNextTrack(station.id)
    return new Response('Stream error, advancing to next track', { status: 502 })
  }
}
