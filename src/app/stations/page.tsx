'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Radio, Search, Plus, Users, Play, Loader2, Trash2, Music, Pencil, Check, X } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { useAuth } from '@/context/auth-context'
import { usePlayerStore, Track } from '@/store/player-store'
import Image from 'next/image'

interface StationData {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isLive: boolean
  isPublic: boolean
  listenKey: string
  playCount: number
  listenerCount: number
  queue: Array<{
    id: string
    position: number
    status: string
    track: Track
  }>
  _count?: { queue: number }
}

export default function StationsPage() {
  const { user, loading: authLoading } = useAuth()
  const { playTrack, setQueue, addToQueue } = usePlayerStore()
  const [myStations, setMyStations] = useState<StationData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchMyStations = useCallback(async () => {
    try {
      const res = await fetch('/api/stations?mine=true')
      if (res.ok) {
        const data = await res.json()
        setMyStations(data.stations || [])
      }
    } catch {
      console.error('Failed to fetch stations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      fetchMyStations()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading, fetchMyStations])

  const handlePlayStation = (station: StationData) => {
    const tracks = station.queue
      .filter(q => q.status === 'PENDING')
      .sort((a, b) => a.position - b.position)
    
    if (tracks.length === 0) return
    
    // Play the first track
    playTrack(tracks[0].track)
    
    // Set remaining as queue
    const queueItems = tracks.slice(1).map((item, index) => ({
      id: item.id,
      position: index,
      status: 'PENDING' as const,
      track: item.track
    }))
    setQueue(queueItems)
  }

  const handleRenameStation = async (stationId: string) => {
    if (!editName.trim()) return
    try {
      const res = await fetch(`/api/stations/${stationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      })
      if (res.ok) {
        setEditingId(null)
        await fetchMyStations()
      }
    } catch {
      console.error('Failed to rename station')
    }
  }

  const handleDeleteStation = async (stationId: string) => {
    try {
      const res = await fetch(`/api/stations/${stationId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeletingId(null)
        await fetchMyStations()
      }
    } catch {
      console.error('Failed to delete station')
    }
  }

  return (
    <AppLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Stations</h1>
            <p className="text-gray-400">
              Manage your radio stations — add songs, play, and share
            </p>
          </div>
          <Link
            href="/stations/create"
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            New Station
          </Link>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : !user ? (
          <div className="text-center py-20">
            <Radio className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Sign in to manage stations</h3>
            <p className="text-gray-400 mb-6">Create and manage your own radio stations</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 rounded-lg font-semibold hover:bg-purple-400 transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : myStations.length === 0 ? (
          <div className="text-center py-20">
            <Radio className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No stations yet</h3>
            <p className="text-gray-400 mb-6">Create your first radio station and start adding songs</p>
            <Link
              href="/stations/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Create Station
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myStations.map((station) => (
              <div
                key={station.id}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center gap-5">
                  {/* Station Image */}
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {station.imageUrl ? (
                      <Image src={station.imageUrl} alt={station.name} width={80} height={80} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <Radio className="w-8 h-8 text-white/80" />
                    )}
                  </div>

                  {/* Station Info */}
                  <div className="flex-1 min-w-0">
                    {editingId === station.id ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-lg font-bold focus:outline-none focus:border-purple-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameStation(station.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <button onClick={() => handleRenameStation(station.id)} className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-xl font-bold truncate">
                        {station.name}
                        {station.isLive && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full align-middle">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            LIVE
                          </span>
                        )}
                      </h3>
                    )}
                    {station.description && (
                      <p className="text-sm text-gray-400 truncate">{station.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Music className="w-4 h-4" />
                        {station.queue?.length || 0} tracks
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        {station.playCount} plays
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePlayStation(station)}
                      disabled={!station.queue?.length}
                      className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-400 disabled:bg-gray-700 disabled:text-gray-500 rounded-full font-medium transition-colors"
                    >
                      <Play className="w-5 h-5" />
                      Play
                    </button>
                    <Link
                      href={`/stations/${station.id}`}
                      className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-full font-medium transition-colors text-sm"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => {
                        setEditingId(station.id)
                        setEditName(station.name)
                      }}
                      className="p-2.5 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                      title="Rename"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {deletingId === station.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDeleteStation(station.id)} className="p-2.5 rounded-full bg-red-500 hover:bg-red-400 transition-colors text-white text-xs font-medium px-3">
                          Delete
                        </button>
                        <button onClick={() => setDeletingId(null)} className="p-2.5 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors text-xs px-3">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(station.id)}
                        className="p-2.5 rounded-full bg-gray-700 hover:bg-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
