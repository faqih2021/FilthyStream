'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Radio,
  ArrowLeft,
  Play,
  Pause,
  Share2,
  Music,
  Copy,
  Check,
  Loader2,
  Trash2,
  ExternalLink,
  Pencil,
  X,
  Podcast,
  Clock
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { AddTrackForm } from '@/components/add-track-form'
import { usePlayerStore, Track } from '@/store/player-store'
import { parseUrl, formatDuration } from '@/lib/url-parser'

interface StationPageProps {
  params: Promise<{ id: string }>
}

export default function StationPage({ params }: StationPageProps) {
  const { id } = use(params)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingTrack, setIsAddingTrack] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [addTrackError, setAddTrackError] = useState<string | null>(null)
  const [isTogglingLive, setIsTogglingLive] = useState(false)
  const [liveTimer, setLiveTimer] = useState('')
  const hasResumedRef = useRef(false)
  const [station, setStation] = useState<{
    id: string
    name: string
    description: string | null
    imageUrl: string | null
    isLive: boolean
    liveStartedAt: string | null
    currentPosition: number
    listenKey: string
    playCount: number
  } | null>(null)
  const [stationTracks, setStationTracks] = useState<Array<{
    id: string
    position: number
    status: string
    track: Track
  }>>([])
  
  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    setQueue,
    playTrack,
    setCurrentStationId,
    removeFromQueue,
    setResumePosition
  } = usePlayerStore()
  
  const fetchStation = useCallback(async () => {
    try {
      const response = await fetch(`/api/stations/${id}`)
      if (!response.ok) throw new Error('Station not found')
      const data = await response.json()
      setStation(data.station)
      setStationTracks(data.station.queue || [])
      setError(null)
    } catch (err) {
      setError('Failed to load station')
      console.error('Error fetching station:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])
  
  useEffect(() => {
    fetchStation()
    setCurrentStationId(id)
    // Don't clear currentStationId on unmount — keep it so DB sync
    // continues working when navigating away while music plays
  }, [id, setCurrentStationId, fetchStation])

  // Auto-resume playback if station is live and we just loaded/refreshed
  useEffect(() => {
    if (hasResumedRef.current || !station || !station.isLive) return
    const playingItem = stationTracks.find(q => q.status === 'PLAYING')
    if (!playingItem) return

    hasResumedRef.current = true
    // Set resume position so YouTubePlayer seeks after loading
    if (station.currentPosition > 5) {
      setResumePosition(station.currentPosition)
    }
    playTrack(playingItem.track)
    const rest = stationTracks
      .filter(q => q.status === 'PENDING')
      .map((item, i) => ({
        id: item.id,
        position: i,
        status: 'PENDING' as const,
        track: item.track
      }))
    setQueue(rest)
  }, [station, stationTracks, playTrack, setQueue, setResumePosition])

  // Live timer - update every second
  useEffect(() => {
    if (!station?.isLive || !station?.liveStartedAt) {
      setLiveTimer('')
      return
    }
    const updateTimer = () => {
      const elapsed = Date.now() - new Date(station.liveStartedAt!).getTime()
      const totalSec = Math.floor(elapsed / 1000)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      const remaining = Math.max(0, 6 * 3600 - totalSec)
      const rh = Math.floor(remaining / 3600)
      const rm = Math.floor((remaining % 3600) / 60)
      setLiveTimer(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s on air \u00B7 ${rh}h ${rm.toString().padStart(2, '0')}m remaining`)
      if (remaining <= 0) {
        setStation(prev => prev ? { ...prev, isLive: false, liveStartedAt: null } : prev)
      }
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [station?.isLive, station?.liveStartedAt])
  
  const handlePlayAll = async () => {
    const pending = stationTracks.filter(q => q.status === 'PENDING')
    if (pending.length === 0) return
    
    playTrack(pending[0].track)
    
    // Sync to DB: mark first track as PLAYING
    try {
      await fetch(`/api/stations/${id}/queue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-playing', itemId: pending[0].id })
      })
    } catch (e) { console.error('Failed to sync play state:', e) }
    
    const rest = pending.slice(1).map((item, i) => ({
      id: item.id,
      position: i,
      status: 'PENDING' as const,
      track: item.track
    }))
    setQueue(rest)
  }
  
  const handleAddTrack = async (url: string) => {
    setIsAddingTrack(true)
    setAddTrackError(null)
    try {
      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      let trackData
      if (response.ok) {
        const data = await response.json()
        trackData = {
          title: data.track.title,
          artist: data.track.artist,
          album: data.track.album,
          duration: data.track.duration,
          imageUrl: data.track.imageUrl,
          sourceType: data.track.sourceType,
          sourceId: data.track.sourceId,
          sourceUrl: data.track.sourceUrl
        }
      } else {
        const parsed = parseUrl(url)
        if (!parsed) throw new Error('Invalid URL')
        trackData = {
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
      }
      
      const queueResponse = await fetch(`/api/stations/${id}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackData })
      })
      
      if (queueResponse.status === 409) {
        setAddTrackError('Track is already in the queue!')
        return
      }
      
      if (queueResponse.ok) {
        await fetchStation()
      }
    } catch (error) {
      console.error('Failed to add track:', error)
      setAddTrackError('Failed to add track')
    } finally {
      setIsAddingTrack(false)
    }
  }
  
  const handleRemoveTrack = async (queueItemId: string) => {
    try {
      await fetch(`/api/stations/${id}/queue`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId })
      })
      setStationTracks(prev => prev.filter(t => t.id !== queueItemId))
      removeFromQueue(queueItemId)
    } catch (error) {
      console.error('Failed to remove track:', error)
    }
  }
  
  const handleRenameSave = async () => {
    if (!newName.trim() || !station) return
    try {
      const res = await fetch(`/api/stations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })
      if (res.ok) {
        setStation({ ...station, name: newName.trim() })
        setEditingName(false)
      }
    } catch (error) {
      console.error('Failed to rename:', error)
    }
  }
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/listen/${station?.listenKey}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const pendingTracks = stationTracks.filter(item => item.status === 'PENDING')

  const handleGoLive = async () => {
    if (!station || stationTracks.length === 0) return
    setIsTogglingLive(true)
    try {
      const res = await fetch(`/api/stations/${id}/queue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'go-live' })
      })
      if (!res.ok) throw new Error('Failed to go live')
      const data = await res.json()
      
      // Update local state
      setStation({ ...station, isLive: true })
      setStationTracks(data.queue)
      
      // Start playing from first track
      const firstPlaying = data.queue.find((q: { status: string }) => q.status === 'PLAYING')
      if (firstPlaying) {
        playTrack(firstPlaying.track)
        const rest = data.queue
          .filter((q: { status: string }) => q.status === 'PENDING')
          .map((item: { id: string; track: Track }, i: number) => ({
            id: item.id,
            position: i,
            status: 'PENDING' as const,
            track: item.track
          }))
        setQueue(rest)
      }
    } catch (error) {
      console.error('Failed to go live:', error)
    } finally {
      setIsTogglingLive(false)
    }
  }

  const handleGoOffline = async () => {
    if (!station) return
    setIsTogglingLive(true)
    try {
      const res = await fetch(`/api/stations/${id}/queue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'go-offline' })
      })
      if (res.ok) {
        setStation({ ...station, isLive: false })
      }
    } catch (error) {
      console.error('Failed to go offline:', error)
    } finally {
      setIsTogglingLive(false)
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </AppLayout>
    )
  }
  
  if (error || !station) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Radio className="w-16 h-16 text-gray-500" />
          <p className="text-xl text-gray-400">{error || 'Station not found'}</p>
          <Link href="/stations" className="px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors">
            Back to Stations
          </Link>
        </div>
      </AppLayout>
    )
  }
  
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-8">
        {/* Back */}
        <Link href="/stations" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to My Stations
        </Link>
        
        {/* Station Header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="relative w-40 h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900 to-pink-900 flex-shrink-0">
            {station.imageUrl ? (
              <Image src={station.imageUrl} alt={station.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Radio className="w-16 h-16 text-white/50" />
              </div>
            )}
            {station.isLive && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            )}
          </div>
          
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-2xl font-bold focus:outline-none focus:border-purple-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSave()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                />
                <button onClick={handleRenameSave} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
                  <Check className="w-5 h-5" />
                </button>
                <button onClick={() => setEditingName(false)} className="p-2 rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{station.name}</h1>
                <button
                  onClick={() => { setEditingName(true); setNewName(station.name) }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                  title="Rename station"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
            {station.description && <p className="text-gray-400 mb-4">{station.description}</p>}
            
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayAll}
                disabled={pendingTracks.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Play className="w-5 h-5" />
                Play All ({pendingTracks.length})
              </button>
              
              {station.isLive ? (
                <button
                  onClick={handleGoOffline}
                  disabled={isTogglingLive}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-full font-semibold transition-colors disabled:opacity-50"
                >
                  {isTogglingLive ? <Loader2 className="w-5 h-5 animate-spin" /> : <Podcast className="w-5 h-5" />}
                  Go Offline
                </button>
              ) : (
                <button
                  onClick={handleGoLive}
                  disabled={isTogglingLive || stationTracks.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isTogglingLive ? <Loader2 className="w-5 h-5 animate-spin" /> : <Podcast className="w-5 h-5" />}
                  Go On Air
                </button>
              )}
              
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-3 border border-[var(--border)] rounded-full font-medium hover:bg-white/5 transition-colors"
              >
                {copied ? <><Check className="w-4 h-4 text-green-400" /><span className="text-green-400">Copied!</span></> : <><Share2 className="w-4 h-4" />Share</>}
              </button>
            </div>
            
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
              <span className="flex items-center gap-1"><Music className="w-4 h-4" />{stationTracks.length} tracks</span>
              <span className="flex items-center gap-1"><Play className="w-4 h-4" />{station.playCount} plays</span>
            </div>
          </div>
        </div>
        
        {/* Share Link + Live Timer */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold">Listener Link</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Share this link so people can listen to your station live.
          </p>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-black/30 border border-[var(--border)] rounded-lg px-4 py-3 font-mono text-sm text-gray-300 truncate">
              {typeof window !== 'undefined' ? window.location.origin : ''}/listen/{station.listenKey}
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium transition-colors flex-shrink-0"
            >
              {copied ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy</>}
            </button>
          </div>
          {station.isLive && liveTimer && (
            <div className="flex items-center gap-2 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-300">{liveTimer}</span>
            </div>
          )}
          {station.isLive && (
            <p className="text-gray-500 text-xs mt-3">
              Station will auto go off-air after 6 hours. You can close this page — listeners will keep hearing music.
            </p>
          )}
        </div>
        
        {/* Add Track */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-2">Add Track</h2>
          <p className="text-gray-400 mb-4 text-sm">Paste a YouTube URL to add it to this station</p>
          <AddTrackForm onAddTrack={handleAddTrack} isLoading={isAddingTrack} />
          {addTrackError && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              <X className="w-4 h-4 flex-shrink-0" />
              {addTrackError}
            </div>
          )}
        </div>
        
        {/* Track List */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Tracks ({stationTracks.length})</h2>
          
          {stationTracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400">No tracks yet. Add your first track above!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stationTracks.map((item, index) => {
                const isCurrentlyPlaying = currentTrack?.sourceId === item.track.sourceId
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                      isCurrentlyPlaying ? 'bg-purple-500/10 border border-purple-500/30' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="w-8 text-center text-sm text-gray-500 font-mono">
                      {isCurrentlyPlaying && isPlaying ? (
                        <span className="flex items-center justify-center gap-0.5">
                          <span className="w-1 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-4 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      ) : (
                        index + 1
                      )}
                    </span>
                    
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex-shrink-0 overflow-hidden">
                      {item.track.imageUrl ? (
                        <Image src={item.track.imageUrl} alt={item.track.title} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isCurrentlyPlaying ? 'text-purple-400' : ''}`}>
                        {item.track.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{item.track.artist || 'Unknown Artist'}</p>
                    </div>
                    
                    <span className="text-sm text-gray-500 flex-shrink-0">
                      {item.track.duration ? formatDuration(item.track.duration) : '--:--'}
                    </span>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          if (isCurrentlyPlaying && isPlaying) {
                            setIsPlaying(false)
                          } else {
                            playTrack(item.track)
                            // Sync to DB
                            fetch(`/api/stations/${id}/queue`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'sync-playing', itemId: item.id })
                            }).catch(console.error)
                          }
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        title={isCurrentlyPlaying && isPlaying ? 'Pause' : 'Play'}
                      >
                        {isCurrentlyPlaying && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <a
                        href={item.track.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Open on YouTube"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleRemoveTrack(item.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove track"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
