'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  Users,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { usePlayerStore, Track } from '@/store/player-store'
import { formatDuration } from '@/lib/url-parser'
import { YouTubePlayer } from '@/components/youtube-player'

interface ListenPageProps {
  params: Promise<{ listenKey: string }>
}

interface StationData {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isLive: boolean
  listenKey: string
  listenerCount: number
  currentTrack: Track | null
  upNext: Track[]
}

export default function ListenPage({ params }: ListenPageProps) {
  const { listenKey } = use(params)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [station, setStation] = useState<StationData | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  
  const { currentTrack, isPlaying, setIsPlaying, setCurrentTrack, volume, setVolume } = usePlayerStore()
  
  useEffect(() => {
    const fetchStation = async () => {
      try {
        const response = await fetch(`/api/listen/${listenKey}`)
        if (!response.ok) {
          throw new Error('Station not found')
        }
        const data = await response.json()
        setStation(data.station)
        
        // Auto-load current track if available
        if (data.station.currentTrack) {
          setCurrentTrack(data.station.currentTrack)
        }
        
        setError(null)
      } catch (err) {
        setError('Station not found or no longer available')
        console.error('Error fetching station:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStation()
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchStation, 10000)
    return () => clearInterval(interval)
  }, [listenKey, setCurrentTrack])
  
  const toggleMute = () => {
    if (isMuted) {
      setVolume(0.7)
      setIsMuted(false)
    } else {
      setVolume(0)
      setIsMuted(true)
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Connecting to station...</p>
        </div>
      </div>
    )
  }
  
  if (error || !station) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center gap-4">
        <Radio className="w-20 h-20 text-gray-500" />
        <h1 className="text-2xl font-bold">Station Not Found</h1>
        <p className="text-gray-400">{error || 'This station does not exist or is no longer available.'}</p>
        <Link
          href="/stations"
          className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-semibold hover:opacity-90 transition-opacity"
        >
          Browse Stations
        </Link>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">FilthyStream</span>
          </Link>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            <span>{station.listenerCount} listening</span>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-8">
        {/* Station Info */}
        <div className="text-center mb-12">
          <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900 to-pink-900 mb-6 shadow-2xl shadow-purple-500/20">
            {station.imageUrl ? (
              <Image
                src={station.imageUrl}
                alt={station.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Radio className="w-20 h-20 text-white/50" />
              </div>
            )}
            {station.isLive && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            )}
          </div>
          
          <h1 className="text-4xl font-bold mb-2">{station.name}</h1>
          {station.description && (
            <p className="text-gray-400 text-lg max-w-xl mx-auto">{station.description}</p>
          )}
        </div>
        
        {/* Now Playing */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-8 mb-8">
          {currentTrack ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                {currentTrack.imageUrl ? (
                  <Image
                    src={currentTrack.imageUrl}
                    alt={currentTrack.title}
                    fill
                    className={`object-cover ${isPlaying ? 'animate-pulse' : ''}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-12 h-12 text-gray-500" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <p className="text-purple-400 text-sm font-semibold uppercase mb-2">Now Playing</p>
                <h2 className="text-2xl font-bold mb-1">{currentTrack.title}</h2>
                <p className="text-gray-400 text-lg">{currentTrack.artist || 'Unknown Artist'}</p>
                {currentTrack.duration && (
                  <p className="text-gray-500 text-sm mt-2">{formatDuration(currentTrack.duration)}</p>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-purple-500/30"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-white" />
                  ) : (
                    <Play className="w-7 h-7 text-white ml-1" />
                  )}
                </button>
                
                <button
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Radio className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-xl text-gray-400">Waiting for broadcast...</p>
              <p className="text-gray-500 mt-2">The station is currently silent</p>
            </div>
          )}
        </div>
        
        {/* Up Next */}
        {station.upNext && station.upNext.length > 0 && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">Up Next</h3>
            <div className="space-y-3">
              {station.upNext.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-white/5"
                >
                  <span className="text-gray-500 font-mono w-6 text-center">{index + 1}</span>
                  <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                    {track.imageUrl ? (
                      <Image
                        src={track.imageUrl}
                        alt={track.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title}</p>
                    <p className="text-sm text-gray-400 truncate">{track.artist || 'Unknown'}</p>
                  </div>
                  {track.duration && (
                    <span className="text-sm text-gray-500">{formatDuration(track.duration)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Create Your Own */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">Want to create your own radio station?</p>
          <Link
            href="/stations/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full font-semibold hover:bg-white/20 transition-colors"
          >
            <Radio className="w-5 h-5" />
            Create Station
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </main>
      
      {/* Hidden YouTube Player */}
      <YouTubePlayer />
    </div>
  )
}
