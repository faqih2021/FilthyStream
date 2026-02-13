'use client'

import { useState, useEffect, useRef, use } from 'react'
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
  ExternalLink,
  Copy,
  Check,
  Wifi,
  WifiOff
} from 'lucide-react'
import { formatDuration } from '@/lib/url-parser'

const LOGO_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logo-etc/filthystream-logo.png`

interface ListenPageProps {
  params: Promise<{ listenKey: string }>
}

interface TrackInfo {
  id: string
  title: string
  artist: string | null
  album: string | null
  duration: number | null
  imageUrl: string | null
  sourceType: string
  sourceId: string
  sourceUrl: string
}

interface StationData {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isLive: boolean
  listenKey: string
  listenerCount: number
  currentTrack: TrackInfo | null
  upNext: TrackInfo[]
}

export default function ListenPage({ params }: ListenPageProps) {
  const { listenKey } = use(params)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [station, setStation] = useState<StationData | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevVolume = useRef(0.8)
  
  const streamUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/stream/${listenKey}` 
    : ''
  
  // Fetch station info
  useEffect(() => {
    const fetchStation = async () => {
      try {
        const response = await fetch(`/api/listen/${listenKey}`)
        if (!response.ok) throw new Error('Station not found')
        const data = await response.json()
        setStation(data.station)
        setError(null)
      } catch (err) {
        setError('Station not found or no longer available')
        console.error('Error fetching station:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStation()
    // Poll for track info updates
    const interval = setInterval(fetchStation, 15000)
    return () => clearInterval(interval)
  }, [listenKey])
  
  // Setup audio element
  useEffect(() => {
    if (!streamUrl) return
    
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio
    
    audio.addEventListener('playing', () => {
      setIsPlaying(true)
      setIsBuffering(false)
      setIsConnected(true)
    })
    
    audio.addEventListener('pause', () => {
      setIsPlaying(false)
    })
    
    audio.addEventListener('waiting', () => {
      setIsBuffering(true)
    })
    
    audio.addEventListener('error', () => {
      setIsConnected(false)
      setIsPlaying(false)
      setIsBuffering(false)
    })
    
    audio.addEventListener('ended', () => {
      setIsConnected(false)
      setIsPlaying(false)
      // Auto reconnect after a short delay (next track may be starting)
      setTimeout(() => {
        handlePlay()
      }, 2000)
    })
    
    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl])
  
  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])
  
  const handlePlay = () => {
    if (!audioRef.current || !streamUrl) return
    
    setIsBuffering(true)
    // Add timestamp to prevent caching
    audioRef.current.src = `${streamUrl}?t=${Date.now()}`
    audioRef.current.play().catch((err: unknown) => {
      console.error('Play error:', err)
      setIsBuffering(false)
    })
  }
  
  const handlePause = () => {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.src = ''
    setIsConnected(false)
  }
  
  const togglePlay = () => {
    if (isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }
  
  const toggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume.current)
      setIsMuted(false)
    } else {
      prevVolume.current = volume
      setVolume(0)
      setIsMuted(true)
    }
  }
  
  const handleCopyStreamUrl = () => {
    navigator.clipboard.writeText(streamUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            <Image src={LOGO_URL} alt="FilthyStream" width={40} height={40} className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-xl font-bold gradient-text">FilthyStream</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className={`flex items-center gap-1.5 text-sm ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              <span>{station.listenerCount} listening</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-8">
        {/* Station Info + Player */}
        <div className="text-center mb-12">
          {/* Station Cover */}
          <div className={`relative w-48 h-48 mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900 to-pink-900 mb-6 shadow-2xl ${isPlaying ? 'shadow-purple-500/30' : 'shadow-purple-500/10'} transition-shadow duration-500`}>
            {station.imageUrl ? (
              <Image
                src={station.imageUrl}
                alt={station.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Radio className={`w-20 h-20 text-white/50 ${isPlaying ? 'animate-pulse' : ''}`} />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="flex items-end gap-1 h-8">
                  <div className="w-1 bg-purple-400 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                  <div className="w-1 bg-purple-400 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                  <div className="w-1 bg-purple-400 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '300ms' }} />
                  <div className="w-1 bg-purple-400 rounded-full animate-bounce" style={{ height: '80%', animationDelay: '450ms' }} />
                </div>
              </div>
            )}
          </div>
          
          <h1 className="text-4xl font-bold mb-2">{station.name}</h1>
          {station.description && (
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-6">{station.description}</p>
          )}
          
          {/* Big Play Button */}
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={togglePlay}
              disabled={isBuffering}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-purple-500/30 disabled:opacity-70"
            >
              {isBuffering ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </button>
            
            {/* Volume */}
            <div className="flex items-center gap-3">
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
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setVolume(v)
                  if (v > 0) setIsMuted(false)
                }}
                className="w-32 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>
          </div>
        </div>
        
        {/* Now Playing */}
        {station.currentTrack && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-8">
            <p className="text-purple-400 text-sm font-semibold uppercase mb-4">Now Playing</p>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                {station.currentTrack.imageUrl ? (
                  <Image
                    src={station.currentTrack.imageUrl}
                    alt={station.currentTrack.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold truncate">{station.currentTrack.title}</h3>
                <p className="text-gray-400 truncate">{station.currentTrack.artist || 'Unknown Artist'}</p>
              </div>
              {station.currentTrack.duration && (
                <span className="text-sm text-gray-500">{formatDuration(station.currentTrack.duration)}</span>
              )}
            </div>
          </div>
        )}
        
        {/* Up Next */}
        {station.upNext && station.upNext.length > 0 && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-8">
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
        
        {/* Stream URL */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold">Stream URL</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Use this URL in VLC, car radios, or any audio player to listen
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-black/30 border border-[var(--border)] rounded-lg px-4 py-3 font-mono text-sm text-gray-300 truncate">
              {streamUrl}
            </div>
            <button
              onClick={handleCopyStreamUrl}
              className="flex items-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium whitespace-nowrap transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
        
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
    </div>
  )
}
