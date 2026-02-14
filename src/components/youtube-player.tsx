'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePlayerStore } from '@/store/player-store'

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          height: string
          width: string
          videoId: string
          playerVars?: Record<string, number | string>
          events?: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { data: number }) => void
            onError?: (event: { data: number }) => void
          }
        }
      ) => YTPlayer
      PlayerState: {
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setVolume: (volume: number) => void
  getVolume: () => number
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  loadVideoById: (videoId: string) => void
  cueVideoById: (videoId: string) => void
  destroy: () => void
}

// Global singleton guard — only one YouTubePlayer instance should exist
let globalPlayerInstance: YTPlayer | null = null
let globalPlayerMounted = false

export function YouTubePlayer() {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const positionSyncRef = useRef<NodeJS.Timeout | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  // Track the last sourceId we loaded to avoid re-loading same video
  const lastLoadedIdRef = useRef<string | null>(null)
  
  const {
    currentTrack,
    isPlaying,
    volume,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    playNext,
    resumePosition,
    setResumePosition
  } = usePlayerStore()
  
  const startTimeTracking = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime()
        const duration = playerRef.current.getDuration()
        setCurrentTime(Math.floor(currentTime))
        if (duration > 0) {
          setDuration(Math.floor(duration))
        }
      }
    }, 1000)
  }, [setCurrentTime, setDuration])
  
  const stopTimeTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])
  
  // Load YouTube IFrame API
  useEffect(() => {
    // Singleton guard: if another instance is already mounted, skip
    if (globalPlayerMounted && globalPlayerInstance) {
      playerRef.current = globalPlayerInstance
      setIsPlayerReady(true)
      // Sync lastLoadedIdRef with whatever is currently playing
      const currentTrack = usePlayerStore.getState().currentTrack
      if (currentTrack) {
        lastLoadedIdRef.current = currentTrack.sourceId
      }
      return
    }
    
    globalPlayerMounted = true
    
    if (typeof window !== 'undefined' && !window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      
      window.onYouTubeIframeAPIReady = () => {
        initializePlayer()
      }
    } else if (window.YT) {
      initializePlayer()
    }
    
    return () => {
      globalPlayerMounted = false
      globalPlayerInstance = null
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (positionSyncRef.current) {
        clearInterval(positionSyncRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  const initializePlayer = () => {
    if (!containerRef.current || playerRef.current) return
    
    const playerId = 'youtube-player-' + Date.now()
    const playerDiv = document.createElement('div')
    playerDiv.id = playerId
    containerRef.current.appendChild(playerDiv)
    
    playerRef.current = new window.YT.Player(playerId, {
      height: '0',
      width: '0',
      videoId: '',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        origin: window.location.origin,
        rel: 0
      },
      events: {
        onReady: (event) => {
          globalPlayerInstance = playerRef.current
          setIsPlayerReady(true)
          event.target.setVolume(usePlayerStore.getState().volume * 100)
          // Sync lastLoadedIdRef with current track on ready (in case of re-init)
          const track = usePlayerStore.getState().currentTrack
          if (track) {
            lastLoadedIdRef.current = track.sourceId
          }
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            stopTimeTracking()
            // Sync DB before advancing local queue
            const stationId = usePlayerStore.getState().currentStationId
            if (stationId) {
              fetch(`/api/stations/${stationId}/queue`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'play-next' })
              }).catch(console.error)
            }
            usePlayerStore.getState().playNext()
          } else if (event.data === window.YT.PlayerState.PLAYING) {
            startTimeTracking()
            // Check if we need to seek to a resume position
            const rp = usePlayerStore.getState().resumePosition
            if (rp && rp > 5 && playerRef.current) {
              playerRef.current.seekTo(rp, true)
              usePlayerStore.getState().setResumePosition(null)
            }
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            stopTimeTracking()
          }
        },
        onError: (event) => {
          console.error('YouTube Player Error:', event.data)
          const stationId = usePlayerStore.getState().currentStationId
          if (stationId) {
            fetch(`/api/stations/${stationId}/queue`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'play-next' })
            }).catch(console.error)
          }
          usePlayerStore.getState().playNext()
        }
      }
    }) as unknown as YTPlayer
  }
  
  // Handle track changes - use loadVideoById which auto-plays
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return
    if (!currentTrack || currentTrack.sourceType !== 'YOUTUBE') return
    
    // Only load if it's a different video
    if (lastLoadedIdRef.current === currentTrack.sourceId) return
    lastLoadedIdRef.current = currentTrack.sourceId
    
    // loadVideoById auto-plays the video - this is the ONLY place that starts playback for new tracks
    playerRef.current.loadVideoById(currentTrack.sourceId)
    setDuration(currentTrack.duration || 0)
  }, [currentTrack?.sourceId, isPlayerReady, setDuration, currentTrack?.duration, currentTrack?.sourceType])
  
  // Handle play/pause toggle (user clicking play/pause button)
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return
    if (!currentTrack || currentTrack.sourceType !== 'YOUTUBE') return
    
    // Only act if we've already loaded this video (don't interfere with initial load)
    if (lastLoadedIdRef.current !== currentTrack.sourceId) return
    
    const playerState = playerRef.current.getPlayerState()
    
    if (isPlaying) {
      // Only call playVideo if not already playing
      if (playerState !== window.YT?.PlayerState?.PLAYING) {
        playerRef.current.playVideo()
      }
    } else {
      // Only call pauseVideo if currently playing
      if (playerState === window.YT?.PlayerState?.PLAYING) {
        playerRef.current.pauseVideo()
      }
    }
  }, [isPlaying, isPlayerReady, currentTrack?.sourceType, currentTrack?.sourceId])
  
  // Handle volume changes
  useEffect(() => {
    if (isPlayerReady && playerRef.current) {
      playerRef.current.setVolume(volume * 100)
    }
  }, [volume, isPlayerReady])

  // Periodically sync playback position to DB (every 10s) while playing
  useEffect(() => {
    if (positionSyncRef.current) {
      clearInterval(positionSyncRef.current)
      positionSyncRef.current = null
    }

    if (!isPlaying || !isPlayerReady) return

    positionSyncRef.current = setInterval(() => {
      const stationId = usePlayerStore.getState().currentStationId
      if (!stationId || !playerRef.current) return
      try {
        const pos = playerRef.current.getCurrentTime()
        if (pos > 0) {
          fetch(`/api/stations/${stationId}/queue`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync-position', position: pos })
          }).catch(() => {})
        }
      } catch { /* player might be destroyed */ }
    }, 10000)

    return () => {
      if (positionSyncRef.current) {
        clearInterval(positionSyncRef.current)
        positionSyncRef.current = null
      }
    }
  }, [isPlaying, isPlayerReady])
  
  return (
    <div 
      ref={containerRef} 
      className="fixed -left-[9999px] -top-[9999px] w-0 h-0 overflow-hidden"
      aria-hidden="true"
    />
  )
}
