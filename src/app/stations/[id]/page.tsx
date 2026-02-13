'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Radio,
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  Share2,
  Users,
  Settings,
  Music,
  ExternalLink,
  Copy,
  Check,
  Loader2
} from 'lucide-react'
import { AddTrackForm } from '@/components/add-track-form'
import { Queue } from '@/components/queue'
import { usePlayerStore, Track } from '@/store/player-store'
import { parseUrl } from '@/lib/url-parser'
import { formatDuration } from '@/lib/url-parser'

interface StationPageProps {
  params: Promise<{ id: string }>
}

export default function StationPage({ params }: StationPageProps) {
  const { id } = use(params)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingTrack, setIsAddingTrack] = useState(false)
  const [copied, setCopied] = useState(false)
  const [station, setStation] = useState<{
    id: string
    name: string
    description: string | null
    imageUrl: string | null
    isLive: boolean
    listenKey: string
  } | null>(null)
  
  const {
    currentTrack,
    isPlaying,
    queue,
    setIsPlaying,
    addToQueue,
    playNext,
    setCurrentStationId
  } = usePlayerStore()
  
  useEffect(() => {
    // In production, fetch station data from API
    // For demo, we'll use mock data
    const mockStation = {
      id,
      name: 'Demo Radio Station',
      description: 'A demo station to showcase FilthyStream capabilities',
      imageUrl: null,
      isLive: false,
      listenKey: 'demo-listen-key'
    }
    setStation(mockStation)
    setCurrentStationId(id)
    setIsLoading(false)
    
    // Cleanup on unmount
    return () => {
      setCurrentStationId(null)
    }
  }, [id, setCurrentStationId])
  
  const handleAddTrack = async (url: string) => {
    setIsAddingTrack(true)
    
    try {
      // Fetch metadata from API
      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch track metadata')
      }
      
      const data = await response.json()
      const track: Track = {
        id: crypto.randomUUID(),
        title: data.track.title,
        artist: data.track.artist,
        album: data.track.album,
        duration: data.track.duration,
        imageUrl: data.track.imageUrl,
        sourceType: data.track.sourceType,
        sourceId: data.track.sourceId,
        sourceUrl: data.track.sourceUrl
      }
      
      addToQueue({
        id: crypto.randomUUID(),
        position: queue.length,
        status: 'PENDING',
        track
      })
    } catch (error) {
      // Fallback: create basic track from URL
      const parsed = parseUrl(url)
      if (parsed) {
        const track: Track = {
          id: crypto.randomUUID(),
          title: 'YouTube Video',
          artist: 'Loading...',
          album: null,
          duration: null,
          imageUrl: parsed.type === 'YOUTUBE' 
            ? `https://img.youtube.com/vi/${parsed.id}/mqdefault.jpg`
            : null,
          sourceType: parsed.type,
          sourceId: parsed.id,
          sourceUrl: url
        }
        
        addToQueue({
          id: crypto.randomUUID(),
          position: queue.length,
          status: 'PENDING',
          track
        })
      }
    } finally {
      setIsAddingTrack(false)
    }
  }
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/listen/${station?.listenKey}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const pendingTracks = queue.filter(item => item.status === 'PENDING')
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }
  
  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-[var(--border)] bg-[var(--card-bg)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">FilthyStream</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-white/5 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Share
                  </>
                )}
              </button>
              <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
        
        {/* Station Info & Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* Station Header */}
            <div className="flex items-start gap-6 mb-8">
              <div className="relative w-40 h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900 to-pink-900 flex-shrink-0">
                {station?.imageUrl ? (
                  <Image
                    src={station.imageUrl}
                    alt={station.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Radio className="w-16 h-16 text-white/50" />
                  </div>
                )}
                {station?.isLive && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{station?.name}</h1>
                <p className="text-gray-400 mb-4">{station?.description}</p>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      if (pendingTracks.length > 0 && !currentTrack) {
                        playNext()
                      }
                      setIsPlaying(!isPlaying)
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-semibold hover:opacity-90 transition-opacity"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-5 h-5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        {currentTrack ? 'Resume' : 'Start Playing'}
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={playNext}
                    disabled={pendingTracks.length === 0}
                    className="flex items-center gap-2 px-4 py-3 border border-[var(--border)] rounded-full font-medium hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SkipForward className="w-5 h-5" />
                    Skip
                  </button>
                </div>
                
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Music className="w-4 h-4" />
                    {queue.length} tracks
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    0 listeners
                  </span>
                </div>
              </div>
            </div>
            
            {/* Now Playing */}
            {currentTrack && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-8">
                <p className="text-xs text-purple-400 uppercase font-semibold mb-4">Now Playing</p>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                    {currentTrack.imageUrl ? (
                      <Image
                        src={currentTrack.imageUrl}
                        alt={currentTrack.title}
                        fill
                        className={`object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 border-2 border-purple-500 rounded-lg animate-pulse-glow" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{currentTrack.title}</h3>
                    <p className="text-gray-400">{currentTrack.artist || 'Unknown Artist'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500">
                        YouTube
                      </span>
                      {currentTrack.duration && (
                        <span className="text-sm text-gray-500">
                          {formatDuration(currentTrack.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={currentTrack.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                  </a>
                </div>
              </div>
            )}
            
            {/* Add Track */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Add Track</h2>
              <p className="text-gray-400 mb-6">
                Paste a YouTube URL to add it to the queue
              </p>
              <AddTrackForm onAddTrack={handleAddTrack} isLoading={isAddingTrack} />
            </div>
          </div>
        </div>
        
        {/* Mini Player */}
        {currentTrack && (
          <div className="h-20 bg-[var(--card-bg)] border-t border-[var(--border)] flex items-center px-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800">
                {currentTrack.imageUrl ? (
                  <Image
                    src={currentTrack.imageUrl}
                    alt={currentTrack.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-gray-500" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium truncate">{currentTrack.title}</p>
                <p className="text-sm text-gray-400 truncate">{currentTrack.artist || 'Unknown'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-black" />
                ) : (
                  <Play className="w-5 h-5 text-black ml-0.5" />
                )}
              </button>
              <button onClick={playNext} className="text-gray-400 hover:text-white">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Queue Sidebar */}
      <aside className="w-80 bg-[var(--card-bg)] border-l border-[var(--border)] flex-shrink-0 overflow-hidden">
        <Queue />
      </aside>
    </div>
  )
}
