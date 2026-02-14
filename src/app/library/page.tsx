'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/app-layout'
import { Music, Plus, Play, Trash2, Radio, Heart, Clock, ListMusic, Loader2 } from 'lucide-react'
import { usePlayerStore } from '@/store/player-store'
import { useAuth } from '@/context/auth-context'
import Link from 'next/link'
import Image from 'next/image'

interface Track {
  id: string
  title: string
  artist: string | null
  album: string | null
  duration: number | null
  imageUrl: string | null
  sourceType: 'YOUTUBE'
  sourceId: string
  sourceUrl: string
}

interface SavedTrack {
  id: string
  savedAt: string
  track: Track
}

interface Playlist {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  trackCount: number
  tracks: Track[]
}

interface HistoryEntry {
  id: string
  playedAt: string
  track: Track
}

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'history'>('tracks')
  const { user, loading: authLoading } = useAuth()
  const { addToQueue, queue, playTrack } = usePlayerStore()
  
  // Data states
  const [savedTracks, setSavedTracks] = useState<SavedTrack[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  
  // Loading states
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Create playlist state
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  
  // Fetch saved tracks
  const fetchSavedTracks = useCallback(async () => {
    if (!user) return
    setLoadingTracks(true)
    try {
      const res = await fetch('/api/library/saved')
      if (res.ok) {
        const data = await res.json()
        setSavedTracks(data.tracks || [])
      }
    } catch (error) {
      console.error('Error fetching saved tracks:', error)
    } finally {
      setLoadingTracks(false)
    }
  }, [user])
  
  // Fetch playlists
  const fetchPlaylists = useCallback(async () => {
    if (!user) return
    setLoadingPlaylists(true)
    try {
      const res = await fetch('/api/library/playlists')
      if (res.ok) {
        const data = await res.json()
        setPlaylists(data.playlists || [])
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
    } finally {
      setLoadingPlaylists(false)
    }
  }, [user])
  
  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!user) return
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/library/history')
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }, [user])
  
  // Fetch data when tab changes
  useEffect(() => {
    if (!user) return
    
    if (activeTab === 'tracks') {
      fetchSavedTracks()
    } else if (activeTab === 'playlists') {
      fetchPlaylists()
    } else if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab, user, fetchSavedTracks, fetchPlaylists, fetchHistory])
  
  const handlePlayTrack = (track: Track) => {
    playTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      imageUrl: track.imageUrl,
      sourceType: 'YOUTUBE' as const,
      sourceId: track.sourceId,
      sourceUrl: track.sourceUrl
    })
    
    // Add to listening history
    fetch('/api/library/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: track.id })
    }).catch(console.error)
  }
  
  const handleAddToQueue = (track: Track) => {
    addToQueue({
      id: crypto.randomUUID(),
      position: queue.length,
      status: 'PENDING',
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        imageUrl: track.imageUrl,
        sourceType: 'YOUTUBE' as const,
        sourceId: track.sourceId,
        sourceUrl: track.sourceUrl
      }
    })
  }
  
  const handleRemoveSavedTrack = async (id: string) => {
    try {
      const res = await fetch(`/api/library/saved?id=${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setSavedTracks(prev => prev.filter(st => st.id !== id))
      }
    } catch (error) {
      console.error('Error removing saved track:', error)
    }
  }
  
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return
    
    try {
      const res = await fetch('/api/library/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlaylistName })
      })
      
      if (res.ok) {
        setNewPlaylistName('')
        setIsCreatingPlaylist(false)
        fetchPlaylists()
      }
    } catch (error) {
      console.error('Error creating playlist:', error)
    }
  }
  
  const handleDeletePlaylist = async (id: string) => {
    try {
      const res = await fetch(`/api/library/playlists?id=${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setPlaylists(prev => prev.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting playlist:', error)
    }
  }
  
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Library</h1>
          <p className="text-gray-400">
            Your saved tracks, playlists, and listening history
          </p>
        </div>
        
        {/* Auth Check */}
        {!authLoading && !user ? (
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Sign in to access your library</h3>
            <p className="text-gray-400 mb-6">
              Save your favorite tracks and create playlists
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-4 mb-8 border-b border-[var(--border)]">
              <button
                onClick={() => setActiveTab('tracks')}
                className={`pb-4 px-2 font-medium transition-colors border-b-2 ${
                  activeTab === 'tracks'
                    ? 'text-purple-400 border-purple-400'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Saved Tracks
                </div>
              </button>
              <button
                onClick={() => setActiveTab('playlists')}
                className={`pb-4 px-2 font-medium transition-colors border-b-2 ${
                  activeTab === 'playlists'
                    ? 'text-purple-400 border-purple-400'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4" />
                  Playlists
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-4 px-2 font-medium transition-colors border-b-2 ${
                  activeTab === 'history'
                    ? 'text-purple-400 border-purple-400'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  History
                </div>
              </button>
            </div>
            
            {/* Saved Tracks */}
            {activeTab === 'tracks' && (
              <div className="space-y-2">
                {loadingTracks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : savedTracks.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">No saved tracks yet</p>
                    <p className="text-sm text-gray-500">
                      Save tracks from the queue to see them here
                    </p>
                  </div>
                ) : (
                  savedTracks.map((st, index) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <span className="w-6 text-center text-gray-500 text-sm">
                        {index + 1}
                      </span>
                      <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {st.track.imageUrl ? (
                          <Image 
                            src={st.track.imageUrl} 
                            alt={st.track.title} 
                            width={48}
                            height={48}
                            className="w-full h-full object-cover" 
                            unoptimized
                          />
                        ) : (
                          <Radio className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{st.track.title}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {st.track.artist || 'Unknown Artist'}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 hidden sm:block">
                        {formatDuration(st.track.duration)}
                      </span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePlayTrack(st.track)}
                          className="p-2 rounded-full bg-purple-500 hover:bg-purple-400 transition-colors"
                        >
                          <Play className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={() => handleAddToQueue(st.track)}
                          className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                          title="Add to queue"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={() => handleRemoveSavedTrack(st.id)}
                          className="p-2 rounded-full bg-gray-700 hover:bg-red-500 transition-colors"
                          title="Remove from saved"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {/* Playlists */}
            {activeTab === 'playlists' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Create Playlist Card */}
                {isCreatingPlaylist ? (
                  <div className="aspect-square rounded-xl border-2 border-purple-500 p-4 flex flex-col">
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Playlist name"
                      className="bg-transparent border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={handleCreatePlaylist}
                        className="flex-1 py-2 bg-purple-500 rounded-lg text-sm font-medium hover:bg-purple-400"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingPlaylist(false)
                          setNewPlaylistName('')
                        }}
                        className="flex-1 py-2 bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsCreatingPlaylist(true)}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-700 hover:border-purple-500 transition-colors flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-purple-500/20 flex items-center justify-center transition-colors">
                      <Plus className="w-6 h-6 text-gray-500 group-hover:text-purple-400" />
                    </div>
                    <span className="text-gray-500 group-hover:text-purple-400 font-medium">Create Playlist</span>
                  </button>
                )}
                
                {loadingPlaylists ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : (
                  playlists.map((playlist) => (
                    <Link
                      key={playlist.id}
                      href={`/library/playlists/${playlist.id}`}
                      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 hover:bg-white/5 transition-colors group relative block"
                    >
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 mb-4 flex items-center justify-center overflow-hidden">
                        {playlist.imageUrl ? (
                          <Image 
                            src={playlist.imageUrl} 
                            alt={playlist.name}
                            width={200}
                            height={200}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <ListMusic className="w-12 h-12 text-white/80" />
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{playlist.name}</h3>
                      <p className="text-sm text-gray-400">{playlist.trackCount} tracks</p>
                      
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeletePlaylist(playlist.id)
                        }}
                        className="absolute top-2 right-2 p-2 rounded-full bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </Link>
                  ))
                )}
              </div>
            )}
            
            {/* History */}
            {activeTab === 'history' && (
              <div className="space-y-2">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400">Your listening history will appear here</p>
                  </div>
                ) : (
                  history.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <span className="w-6 text-center text-gray-500 text-sm">
                        {index + 1}
                      </span>
                      <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {entry.track.imageUrl ? (
                          <Image 
                            src={entry.track.imageUrl} 
                            alt={entry.track.title}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <Radio className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.track.title}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {entry.track.artist || 'Unknown Artist'}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 hidden sm:block">
                        {formatDate(entry.playedAt)}
                      </span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePlayTrack(entry.track)}
                          className="p-2 rounded-full bg-purple-500 hover:bg-purple-400 transition-colors"
                        >
                          <Play className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={() => handleAddToQueue(entry.track)}
                          className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                          title="Add to queue"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
