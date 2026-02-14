'use client'

import { useEffect, useRef, useState } from 'react'
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
  destroy: () => void
}

export function YouTubePlayer() {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  
  const {
    currentTrack,
    isPlaying,
    volume,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    playNext
  } = usePlayerStore()
  
  // Load YouTube IFrame API
  useEffect(() => {
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
      if (playerRef.current) {
        playerRef.current.destroy()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
  
  const initializePlayer = () => {
    if (!containerRef.current || playerRef.current) return
    
    // Create a placeholder div for the player
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
          setIsPlayerReady(true)
          event.target.setVolume(volume * 100)
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            // Auto-play next track
            playNext()
          } else if (event.data === window.YT.PlayerState.PLAYING) {
            // Sync Zustand store with actual player state
            const store = usePlayerStore.getState()
            if (!store.isPlaying) {
              usePlayerStore.getState().setIsPlaying(true)
            }
            // Start time tracking
            startTimeTracking()
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            // Sync Zustand store with actual player state
            const store = usePlayerStore.getState()
            if (store.isPlaying) {
              usePlayerStore.getState().setIsPlaying(false)
            }
            stopTimeTracking()
          }
        },
        onError: (event) => {
          console.error('YouTube Player Error:', event.data)
          // Skip to next track on error
          playNext()
        }
      }
    })
  }
  
  const startTimeTracking = () => {
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
  }
  
  const stopTimeTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }
  
  // Handle track changes
  useEffect(() => {
    if (
      isPlayerReady &&
      playerRef.current &&
      currentTrack?.sourceType === 'YOUTUBE'
    ) {
      // Use cueVideoById (does NOT auto-play) to prevent double audio.
      // The isPlaying effect below will handle actual playback.
      const player = playerRef.current as unknown as {
        loadVideoById: (videoId: string) => void
        cueVideoById: (videoId: string) => void
      }
      
      player.cueVideoById(currentTrack.sourceId)
      setDuration(currentTrack.duration || 0)
      
      // If isPlaying is already true, manually trigger playback after cue
      if (isPlaying) {
        // Small delay to let cue complete
        setTimeout(() => {
          playerRef.current?.playVideo()
        }, 100)
      }
    }
  }, [currentTrack?.sourceId, isPlayerReady])
  
  // Handle play/pause
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return
    
    if (currentTrack?.sourceType === 'YOUTUBE') {
      if (isPlaying) {
        playerRef.current.playVideo()
      } else {
        playerRef.current.pauseVideo()
      }
    }
  }, [isPlaying, isPlayerReady, currentTrack?.sourceType])
  
  // Handle volume changes
  useEffect(() => {
    if (isPlayerReady && playerRef.current) {
      playerRef.current.setVolume(volume * 100)
    }
  }, [volume, isPlayerReady])
  
  return (
    <div 
      ref={containerRef} 
      className="fixed -left-[9999px] -top-[9999px] w-0 h-0 overflow-hidden"
      aria-hidden="true"
    />
  )
}
