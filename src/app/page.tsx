'use client'

import { useState } from 'react'
import { Radio, Zap, Music, Globe, ArrowRight, Play, Users } from 'lucide-react'
import Link from 'next/link'
import { AddTrackForm } from '@/components/add-track-form'
import { Queue } from '@/components/queue'
import { BestStations } from '@/components/best-stations'
import { usePlayerStore } from '@/store/player-store'
import { useAuth } from '@/context/auth-context'
import { parseUrl } from '@/lib/url-parser'

// Demo stations for showcase (fallback)
const demoStations = [
  {
    id: '1',
    name: 'Lo-Fi Beats',
    description: 'Chill beats to relax/study to',
    isLive: true,
    listeners: 1247,
    gradient: 'from-purple-600 to-blue-600'
  },
  {
    id: '2',
    name: 'Indie Mix',
    description: 'Best indie tracks from around the world',
    isLive: true,
    listeners: 823,
    gradient: 'from-pink-600 to-orange-500'
  },
  {
    id: '3',
    name: 'Electronic Dreams',
    description: 'EDM, House, and Techno',
    isLive: false,
    listeners: 0,
    gradient: 'from-cyan-500 to-purple-600'
  },
  {
    id: '4',
    name: 'Rock Classics',
    description: 'Timeless rock anthems',
    isLive: true,
    listeners: 456,
    gradient: 'from-red-600 to-yellow-500'
  }
]

export default function Home() {
  const [isAddingTrack, setIsAddingTrack] = useState(false)
  const { addToQueue, queue } = usePlayerStore()
  const { user } = useAuth()
  
  const handleAddTrack = async (url: string) => {
    setIsAddingTrack(true)
    
    try {
      const parsed = parseUrl(url)
      if (!parsed) throw new Error('Invalid URL')
      
      // Create a demo track (in production, this would fetch metadata from API)
      const newTrack = {
        id: crypto.randomUUID(),
        title: parsed.type === 'YOUTUBE' ? 'YouTube Track' : 'Spotify Track',
        artist: 'Unknown Artist',
        album: null,
        duration: 180, // 3 minutes demo
        imageUrl: null,
        sourceType: parsed.type,
        sourceId: parsed.id,
        sourceUrl: url
      }
      
      addToQueue({
        id: crypto.randomUUID(),
        position: queue.length,
        status: 'PENDING',
        track: newTrack
      })
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
    } finally {
      setIsAddingTrack(false)
    }
  }
  
  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--card-bg)] border-r border-[var(--border)] flex flex-col h-full flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-[var(--border)]">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">FilthyStream</span>
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-500/20 text-purple-400"
          >
            <Radio className="w-5 h-5" />
            <span className="font-medium">Home</span>
          </Link>
          <Link
            href="/stations"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <Globe className="w-5 h-5" />
            <span className="font-medium">Explore</span>
          </Link>
          <Link
            href="/library"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <Music className="w-5 h-5" />
            <span className="font-medium">My Library</span>
          </Link>
        </nav>
        
        {/* Create Station */}
        <div className="p-4 border-t border-[var(--border)] space-y-3">
          <Link
            href="/stations/create"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <Zap className="w-5 h-5" />
            Create Station
          </Link>
          
          {/* User Info */}
          {user ? (
            <Link
              href="/account"
              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || user.username || 'User'}</p>
                  <p className="text-xs text-zinc-500 truncate">@{user.username || 'user'}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-8">
            {/* Hero Section */}
            <section className="mb-12">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 p-12">
                <div className="relative z-10">
                  <h1 className="text-5xl font-bold mb-4">
                    Stream Music from
                    <br />
                    <span className="gradient-text">Spotify & YouTube</span>
                  </h1>
                  <p className="text-xl text-gray-300 mb-8 max-w-xl">
                    Create your own radio station by combining playlists from both platforms.
                    No uploads needed - just paste the links.
                  </p>
                  <div className="flex gap-4">
                    <Link
                      href="/stations/create"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
                    >
                      Create Station
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                      href="/stations"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-colors"
                    >
                      Explore Stations
                    </Link>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/30 to-transparent rounded-full blur-3xl" />
              </div>
            </section>
            
            {/* Quick Add Section */}
            <section className="mb-12">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Quick Add to Queue</h2>
                <p className="text-gray-400 mb-6">
                  Paste a Spotify or YouTube URL to instantly add it to your queue
                </p>
                <AddTrackForm onAddTrack={handleAddTrack} isLoading={isAddingTrack} />
              </div>
            </section>
            
            {/* Featured Stations */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Featured Stations</h2>
                <Link
                  href="/stations"
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {demoStations.map((station) => (
                  <Link
                    key={station.id}
                    href={`/stations/${station.id}`}
                    className="group relative rounded-2xl overflow-hidden aspect-square"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${station.gradient}`} />
                    <div className="absolute inset-0 bg-black/40" />
                    
                    {/* Content */}
                    <div className="relative h-full p-6 flex flex-col justify-between">
                      <div>
                        {station.isLive && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full mb-3">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            LIVE
                          </div>
                        )}
                        <h3 className="text-xl font-bold">{station.name}</h3>
                        <p className="text-sm text-white/70 mt-1">{station.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {station.listeners > 0 && (
                          <div className="flex items-center gap-1 text-white/70 text-sm">
                            <Users className="w-4 h-4" />
                            {station.listeners}
                          </div>
                        )}
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-5 h-5 text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
            
            {/* How It Works */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-purple-400">1</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Paste Links</h3>
                  <p className="text-gray-400">
                    Copy Spotify or YouTube URLs and paste them directly into FilthyStream
                  </p>
                </div>
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-pink-400">2</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Build Your Queue</h3>
                  <p className="text-gray-400">
                    Mix tracks from both platforms, reorder them, and create your perfect playlist
                  </p>
                </div>
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-cyan-400">3</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Go Live</h3>
                  <p className="text-gray-400">
                    Start your radio station and share it with the world. Anyone can tune in!
                  </p>
                </div>
              </div>
            </section>

            {/* Best Stations - Realtime */}
            <section className="mb-12">
              <div className="grid lg:grid-cols-2 gap-6">
                <BestStations limit={5} />
                <Queue />
              </div>
            </section>
          </div>
        </div>
        
        {/* Player Bar */}
        <div className="h-24 bg-[var(--card-bg)] border-t border-[var(--border)] flex items-center px-6">
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center">
                <Radio className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <p className="text-gray-400">No track playing</p>
                <p className="text-sm text-gray-500">Add tracks to queue to start</p>
              </div>
            </div>
            
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-4">
                <button className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform">
                  <Play className="w-6 h-6 text-black ml-1" />
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-400">
              {queue.length} tracks in queue
            </div>
          </div>
        </div>
      </main>
      
      {/* Queue Sidebar */}
      <aside className="w-80 bg-[var(--card-bg)] border-l border-[var(--border)] flex-shrink-0 overflow-hidden">
        <Queue />
      </aside>
    </div>
  )
}
