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
  const [streamCopied, setStreamCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    setQueue,
    playNext,
    setCurrentStationId
  } = usePlayerStore()
  
  useEffect(() => {
    const fetchStation = async () => {
      try {
        const response = await fetch(`/api/stations/${id}`)
        if (!response.ok) {
          throw new Error('Station not found')
        }
        const data = await response.json()
        setStation(data.station)
        setCurrentStationId(id)
        
        // Load queue from database
        if (data.station.queue && data.station.queue.length > 0) {
          const dbQueue = data.station.queue.map((item: { id: string; position: number; status: string; track: Track }) => ({
            id: item.id,
            position: item.position,
            status: item.status,
            track: {
              id: item.track.id,
              title: item.track.title,
              artist: item.track.artist,
              album: item.track.album,
              duration: item.track.duration,
              imageUrl: item.track.imageUrl,
              sourceType: item.track.sourceType,
              sourceId: item.track.sourceId,
              sourceUrl: item.track.sourceUrl
            }
          }))
          setQueue(dbQueue)
        }
        
        setError(null)
      } catch (err) {
        setError('Failed to load station')
        console.error('Error fetching station:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStation()
    
    // Cleanup on unmount
    return () => {
      setCurrentStationId(null)
    }
  }, [id, setCurrentStationId, setQueue])
  
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
      const trackData = {
        title: data.track.title,
        artist: data.track.artist,
        album: data.track.album,
        duration: data.track.duration,
        imageUrl: data.track.imageUrl,
        sourceType: data.track.sourceType,
        sourceId: data.track.sourceId,
        sourceUrl: data.track.sourceUrl
      }
      
      // Save to database
      const queueResponse = await fetch(`/api/stations/${id}/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trackData })
      })
      
      if (queueResponse.ok) {
        const queueData = await queueResponse.json()
        // Add to local queue with the ID from database
        addToQueue({
          id: queueData.queueItem.id,
          position: queue.length,
          status: 'PENDING',
          track: {
            id: queueData.queueItem.track.id,
            title: queueData.queueItem.track.title,
            artist: queueData.queueItem.track.artist,
            album: queueData.queueItem.track.album,
            duration: queueData.queueItem.track.duration,
            imageUrl: queueData.queueItem.track.imageUrl,
            sourceType: queueData.queueItem.track.sourceType,
            sourceId: queueData.queueItem.track.sourceId,
            sourceUrl: queueData.queueItem.track.sourceUrl
          }
        })
      } else {
        // Fallback to local-only queue
        const track: Track = {
          id: crypto.randomUUID(),
          ...trackData
        }
        addToQueue({
          id: crypto.randomUUID(),
          position: queue.length,
          status: 'PENDING',
          track
        })
      }
    } catch (error) {
      // Fallback: create basic track from URL
      const parsed = parseUrl(url)
      if (parsed) {
        const trackData = {
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
        
        // Try to save to database
        try {
          const queueResponse = await fetch(`/api/stations/${id}/queue`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trackData })
          })
          
          if (queueResponse.ok) {
            const queueData = await queueResponse.json()
            addToQueue({
              id: queueData.queueItem.id,
              position: queue.length,
              status: 'PENDING',
              track: {
                id: queueData.queueItem.track.id,
                title: queueData.queueItem.track.title,
                artist: queueData.queueItem.track.artist,
                album: queueData.queueItem.track.album,
                duration: queueData.queueItem.track.duration,
                imageUrl: queueData.queueItem.track.imageUrl,
                sourceType: queueData.queueItem.track.sourceType,
                sourceId: queueData.queueItem.track.sourceId,
                sourceUrl: queueData.queueItem.track.sourceUrl
              }
            })
          } else {
            const track: Track = {
              id: crypto.randomUUID(),
              ...trackData
            }
            addToQueue({
              id: crypto.randomUUID(),
              position: queue.length,
              status: 'PENDING',
              track
            })
          }
        } catch {
          const track: Track = {
            id: crypto.randomUUID(),
            ...trackData
          }
          addToQueue({
            id: crypto.randomUUID(),
            position: queue.length,
            status: 'PENDING',
            track
          })
        }
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
  
  const handleCopyStreamUrl = () => {
    const streamUrl = `${window.location.origin}/api/stream/${station?.listenKey}`
    navigator.clipboard.writeText(streamUrl)
    setStreamCopied(true)
    setTimeout(() => setStreamCopied(false), 2000)
  }
  
  // Sync playNext with database
  const handlePlayNext = async () => {
    // Update database first
    try {
      await fetch(`/api/stations/${id}/queue`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'play-next' })
      })
    } catch (error) {
      console.error('Failed to sync with database:', error)
    }
    
    // Then update local state
    playNext()
  }
  
  const pendingTracks = queue.filter(item => item.status === 'PENDING')
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }
  
  if (error || !station) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center gap-4">
        <Radio className="w-16 h-16 text-gray-500" />
        <p className="text-xl text-gray-400">{error || 'Station not found'}</p>
        <Link
          href="/stations"
          className="px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
        >
          Browse Stations
        </Link>
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
                        handlePlayNext()
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
                    onClick={handlePlayNext}
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
            
            {/* Stream URL */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold">Radio Stream URL</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Direct audio stream URL — works in VLC, car radios, and any audio player.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-black/30 border border-[var(--border)] rounded-lg px-4 py-3 font-mono text-sm text-gray-300 truncate">
                  {window.location.origin}/api/stream/{station.listenKey}
                </div>
                <button
                  onClick={handleCopyStreamUrl}
                  className="flex items-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium transition-colors"
                >
                  {streamCopied ? (
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
              <p className="text-gray-400 text-sm mb-2">
                Web player link — share with listeners for the full experience.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/30 border border-[var(--border)] rounded-lg px-4 py-3 font-mono text-sm text-gray-300 truncate">
                  {window.location.origin}/listen/{station.listenKey}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
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
              <button onClick={handlePlayNext} className="text-gray-400 hover:text-white">
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
