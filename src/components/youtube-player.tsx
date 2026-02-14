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

export function YouTubePlayer() {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
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
    playNext
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
          setIsPlayerReady(true)
          event.target.setVolume(usePlayerStore.getState().volume * 100)
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            stopTimeTracking()
            usePlayerStore.getState().playNext()
          } else if (event.data === window.YT.PlayerState.PLAYING) {
            startTimeTracking()
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            stopTimeTracking()
          }
        },
        onError: (event) => {
          console.error('YouTube Player Error:', event.data)
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
  
  return (
    <div 
      ref={containerRef} 
      className="fixed -left-[9999px] -top-[9999px] w-0 h-0 overflow-hidden"
      aria-hidden="true"
    />
  )
}
