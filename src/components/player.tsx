'use client'

import { usePlayerStore } from '@/store/player-store'
import { formatDuration } from '@/lib/url-parser'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  ListMusic,
  Radio,
  Shuffle,
  Repeat
} from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'

export function Player() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    setIsPlaying,
    setVolume,
    playNext,
    playPrevious
  } = usePlayerStore()
  
  const [showQueue, setShowQueue] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(volume)
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (newVolume > 0) {
      setIsMuted(false)
    }
  }
  
  const toggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      setVolume(0)
      setIsMuted(true)
    }
  }
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  
  return (
    <div className="h-24 bg-[var(--card-bg)] border-t border-[var(--border)] flex items-center px-6">
      {/* Current Track Info */}
      <div className="flex items-center gap-4 w-1/4">
        {currentTrack ? (
          <>
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
              {currentTrack.imageUrl ? (
                <Image
                  src={currentTrack.imageUrl}
                  alt={currentTrack.title}
                  fill
                  className={`object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Radio className="w-6 h-6 text-gray-500" />
                </div>
              )}
              {isPlaying && (
                <div className="absolute inset-0 border-2 border-purple-500 rounded-lg animate-pulse-glow" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{currentTrack.title}</p>
              <p className="text-sm text-gray-400 truncate">{currentTrack.artist || 'Unknown Artist'}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500">
                  YouTube
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center">
              <Radio className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <p className="text-gray-400">No track playing</p>
              <p className="text-sm text-gray-500">Add tracks to queue</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Player Controls */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-white transition-colors">
            <Shuffle className="w-5 h-5" />
          </button>
          <button
            onClick={playPrevious}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-black" />
            ) : (
              <Play className="w-6 h-6 text-black ml-1" />
            )}
          </button>
          <button
            onClick={playNext}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <Repeat className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full max-w-xl flex items-center gap-3">
          <span className="text-xs text-gray-400 w-10 text-right">
            {formatDuration(currentTime)}
          </span>
          <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-10">
            {formatDuration(duration)}
          </span>
        </div>
      </div>
      
      {/* Volume & Queue */}
      <div className="flex items-center gap-4 w-1/4 justify-end">
        <button
          onClick={() => setShowQueue(!showQueue)}
          className={`p-2 rounded-lg transition-colors ${
            showQueue ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <ListMusic className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
        </div>
      </div>
    </div>
  )
}
