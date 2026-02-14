'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { usePlayerStore, Track } from '@/store/player-store'
import { useAuth } from '@/context/auth-context'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Play, 
  Plus, 
  Trash2, 
  Loader2, 
  ListMusic, 
  Radio, 
  Link2, 
  AlertCircle,
  Music 
} from 'lucide-react'

interface PlaylistTrack extends Track {
  playlistTrackId: string
  position: number
  addedAt: string
}

interface PlaylistDetail {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  tracks: PlaylistTrack[]
}

export default function PlaylistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { playTrack, addToQueue, setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore()
  
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Add track form
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [addingTrack, setAddingTrack] = useState(false)
  const [addMessage, setAddMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const playlistId = params.id as string

  const fetchPlaylist = useCallback(async () => {
    try {
      const res = await fetch(`/api/library/playlists/${playlistId}/tracks`)
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Failed to load playlist')
        return
      }
      
      setPlaylist(data.playlist)
    } catch {
      setError('Failed to load playlist')
    } finally {
      setLoading(false)
    }
  }, [playlistId])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchPlaylist()
    }
  }, [user, authLoading, router, fetchPlaylist])

  const handleAddTrack = async () => {
    if (!youtubeUrl.trim()) return
    
    setAddingTrack(true)
    setAddMessage(null)

    try {
      const res = await fetch(`/api/library/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        setAddMessage({ type: 'error', text: data.error || 'Failed to add track' })
        return
      }

      setYoutubeUrl('')
      setAddMessage({ type: 'success', text: `Added "${data.track.title}"` })
      await fetchPlaylist()
      
      // Clear success message after 3 seconds
      setTimeout(() => setAddMessage(null), 3000)
    } catch {
      setAddMessage({ type: 'error', text: 'Failed to add track' })
    } finally {
      setAddingTrack(false)
    }
  }

  const handleRemoveTrack = async (trackId: string) => {
    try {
      const res = await fetch(
        `/api/library/playlists/${playlistId}/tracks?trackId=${trackId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        await fetchPlaylist()
      }
    } catch {
      console.error('Failed to remove track')
    }
  }

  const handlePlayTrack = (track: PlaylistTrack) => {
    const t: Track = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      imageUrl: track.imageUrl,
      sourceType: track.sourceType,
      sourceId: track.sourceId,
      sourceUrl: track.sourceUrl
    }
    playTrack(t)
  }

  const handlePlayAll = () => {
    if (!playlist || playlist.tracks.length === 0) return
    
    // Play first track
    handlePlayTrack(playlist.tracks[0])
    
    // Add remaining tracks to queue
    const remaining = playlist.tracks.slice(1)
    const queueItems = remaining.map((track, index) => ({
      id: `pl-${track.id}-${Date.now()}-${index}`,
      position: index,
      status: 'PENDING' as const,
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        imageUrl: track.imageUrl,
        sourceType: track.sourceType,
        sourceId: track.sourceId,
        sourceUrl: track.sourceUrl
      }
    }))
    
    setQueue(queueItems)
  }

  const handleAddToQueue = (track: PlaylistTrack) => {
    const queueItem = {
      id: `pl-${track.id}-${Date.now()}`,
      position: 0,
      status: 'PENDING' as const,
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        imageUrl: track.imageUrl,
        sourceType: track.sourceType,
        sourceId: track.sourceId,
        sourceUrl: track.sourceUrl
      }
    }
    addToQueue(queueItem)
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </AppLayout>
    )
  }

  if (error || !playlist) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={() => router.push('/library')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Library
          </button>
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-400">{error || 'Playlist not found'}</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <button
          onClick={() => router.push('/library')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Library
        </button>

        {/* Playlist Info */}
        <div className="flex items-start gap-6 mb-8">
          <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {playlist.imageUrl ? (
              <Image
                src={playlist.imageUrl}
                alt={playlist.name}
                width={160}
                height={160}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <ListMusic className="w-16 h-16 text-white/80" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-purple-400 font-medium mb-1">Playlist</p>
            <h1 className="text-3xl font-bold mb-2 truncate">{playlist.name}</h1>
            {playlist.description && (
              <p className="text-gray-400 mb-3">{playlist.description}</p>
            )}
            <p className="text-sm text-gray-500">{playlist.tracks.length} tracks</p>
            
            <div className="flex gap-3 mt-4">
              {playlist.tracks.length > 0 && (
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-400 rounded-full font-medium transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Play All
                </button>
              )}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-full font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Track
              </button>
            </div>
          </div>
        </div>

        {/* Add Track Form */}
        {showAddForm && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-5 h-5 text-purple-400" />
              <h3 className="font-medium">Add Track from YouTube</h3>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste YouTube URL here (e.g. https://youtube.com/watch?v=...)"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTrack()}
              />
              <button
                onClick={handleAddTrack}
                disabled={addingTrack || !youtubeUrl.trim()}
                className="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {addingTrack ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add
              </button>
            </div>
            {addMessage && (
              <div className={`mt-3 text-sm flex items-center gap-2 ${
                addMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
              }`}>
                {addMessage.type === 'error' && <AlertCircle className="w-4 h-4" />}
                {addMessage.text}
              </div>
            )}
          </div>
        )}

        {/* Track List */}
        <div className="space-y-1">
          {playlist.tracks.length === 0 ? (
            <div className="text-center py-16">
              <Music className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">This playlist is empty</p>
              <p className="text-sm text-gray-500">Click &quot;Add Track&quot; to add songs from YouTube</p>
            </div>
          ) : (
            playlist.tracks.map((track, index) => (
              <div
                key={track.playlistTrackId}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <span className="w-6 text-center text-gray-500 text-sm">
                  {index + 1}
                </span>
                <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {track.imageUrl ? (
                    <Image
                      src={track.imageUrl}
                      alt={track.title}
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
                  <p className="font-medium truncate">{track.title}</p>
                  <p className="text-sm text-gray-400 truncate">
                    {track.artist || 'Unknown Artist'}
                  </p>
                </div>
                <span className="text-sm text-gray-500 hidden sm:block">
                  {formatDuration(track.duration)}
                </span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handlePlayTrack(track)}
                    className="p-2 rounded-full bg-purple-500 hover:bg-purple-400 transition-colors"
                    title="Play"
                  >
                    <Play className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => handleAddToQueue(track)}
                    className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                    title="Add to queue"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => handleRemoveTrack(track.id)}
                    className="p-2 rounded-full bg-gray-700 hover:bg-red-500 transition-colors"
                    title="Remove from playlist"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}
