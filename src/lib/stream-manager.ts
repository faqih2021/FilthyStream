import { prisma } from './prisma'

/**
 * StreamManager - Server-side station playback state management
 * 
 * Tracks which track is currently playing on each station,
 * manages auto-advancement when tracks end, and provides
 * the current track info for stream endpoints.
 */

interface StationPlayState {
  stationId: string
  currentTrackSourceId: string | null
  currentTrackStartedAt: number | null // timestamp ms
  currentTrackDuration: number | null  // seconds
}

// In-memory store of active station states
const stationStates = new Map<string, StationPlayState>()

/**
 * Get or initialize the playback state for a station
 */
export async function getStationPlayState(stationId: string): Promise<StationPlayState | null> {
  // Check in-memory cache first
  const cached = stationStates.get(stationId)
  if (cached) {
    // Check if current track has ended
    if (cached.currentTrackStartedAt && cached.currentTrackDuration) {
      const elapsed = (Date.now() - cached.currentTrackStartedAt) / 1000
      if (elapsed >= cached.currentTrackDuration) {
        // Track ended, advance to next
        return await advanceToNextTrack(stationId)
      }
    }
    return cached
  }

  // Load from database
  return await loadStationState(stationId)
}

/**
 * Load station state from database
 */
async function loadStationState(stationId: string): Promise<StationPlayState | null> {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: {
      queue: {
        where: { status: 'PLAYING' },
        include: { track: true },
        take: 1
      }
    }
  })

  if (!station) return null

  if (station.queue.length > 0) {
    const playing = station.queue[0]
    const state: StationPlayState = {
      stationId,
      currentTrackSourceId: playing.track.sourceId,
      currentTrackStartedAt: Date.now(),
      currentTrackDuration: playing.track.duration
    }
    stationStates.set(stationId, state)
    return state
  }

  // No track playing, try to start first pending
  return await advanceToNextTrack(stationId)
}

/**
 * Advance to next track in the queue
 */
export async function advanceToNextTrack(stationId: string): Promise<StationPlayState | null> {
  try {
    // Mark current playing as played
    await prisma.queueItem.updateMany({
      where: {
        stationId,
        status: 'PLAYING'
      },
      data: {
        status: 'PLAYED'
      }
    })

    // Get next pending track
    const nextItem = await prisma.queueItem.findFirst({
      where: {
        stationId,
        status: 'PENDING'
      },
      include: { track: true },
      orderBy: { position: 'asc' }
    })

    if (!nextItem) {
      // No more tracks - station is idle
      const state: StationPlayState = {
        stationId,
        currentTrackSourceId: null,
        currentTrackStartedAt: null,
        currentTrackDuration: null
      }
      stationStates.set(stationId, state)
      return state
    }

    // Set as playing
    await prisma.queueItem.update({
      where: { id: nextItem.id },
      data: { status: 'PLAYING' }
    })

    // Record in play history
    await prisma.playHistory.create({
      data: {
        stationId,
        trackId: nextItem.trackId
      }
    })

    const state: StationPlayState = {
      stationId,
      currentTrackSourceId: nextItem.track.sourceId,
      currentTrackStartedAt: Date.now(),
      currentTrackDuration: nextItem.track.duration
    }
    stationStates.set(stationId, state)
    return state
  } catch (error) {
    console.error('Error advancing track:', error)
    return null
  }
}

/**
 * Get station by listen key and return its play state
 */
export async function getStationByListenKey(listenKey: string) {
  const station = await prisma.station.findUnique({
    where: { listenKey },
    include: {
      queue: {
        include: { track: true },
        orderBy: { position: 'asc' }
      }
    }
  })

  if (!station) return null

  return station
}

/**
 * Clear cached state for a station (e.g., when tracks change)
 */
export function invalidateStationCache(stationId: string) {
  stationStates.delete(stationId)
}
