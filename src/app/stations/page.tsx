'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Radio, Search, Plus, Users, Play } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { StationCard } from '@/components/station-card'

// Demo stations
const demoStations = [
  {
    id: '1',
    name: 'Lo-Fi Beats',
    description: 'Chill beats to relax/study to. Perfect for focus and productivity.',
    imageUrl: null,
    isLive: true,
    listenersCount: 1247,
    ownerName: 'ChillVibes'
  },
  {
    id: '2',
    name: 'Indie Mix',
    description: 'Best indie tracks from around the world. Discover new artists.',
    imageUrl: null,
    isLive: true,
    listenersCount: 823,
    ownerName: 'IndieHead'
  },
  {
    id: '3',
    name: 'Electronic Dreams',
    description: 'EDM, House, and Techno. Non-stop electronic beats.',
    imageUrl: null,
    isLive: false,
    listenersCount: 0,
    ownerName: 'DJElectra'
  },
  {
    id: '4',
    name: 'Rock Classics',
    description: 'Timeless rock anthems from the 70s, 80s, and 90s.',
    imageUrl: null,
    isLive: true,
    listenersCount: 456,
    ownerName: 'RockLegend'
  },
  {
    id: '5',
    name: 'Jazz Cafe',
    description: 'Smooth jazz for your coffee breaks and late nights.',
    imageUrl: null,
    isLive: true,
    listenersCount: 312,
    ownerName: 'JazzMaster'
  },
  {
    id: '6',
    name: 'Hip Hop Nation',
    description: 'Latest hip hop tracks and classic beats.',
    imageUrl: null,
    isLive: false,
    listenersCount: 0,
    ownerName: 'MCFlow'
  },
  {
    id: '7',
    name: 'K-Pop Central',
    description: 'Your daily dose of Korean pop hits.',
    imageUrl: null,
    isLive: true,
    listenersCount: 2103,
    ownerName: 'KPopFan'
  },
  {
    id: '8',
    name: 'Classical Masters',
    description: 'Beethoven, Mozart, Bach, and more classical composers.',
    imageUrl: null,
    isLive: false,
    listenersCount: 0,
    ownerName: 'ClassicalPro'
  }
]

export default function StationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'live' | 'offline'>('all')
  
  const filteredStations = demoStations.filter(station => {
    const matchesSearch = station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filter === 'live') return matchesSearch && station.isLive
    if (filter === 'offline') return matchesSearch && !station.isLive
    return matchesSearch
  })
  
  const liveCount = demoStations.filter(s => s.isLive).length
  const totalListeners = demoStations.reduce((sum, s) => sum + s.listenersCount, 0)
  
  return (
    <AppLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Explore Stations</h1>
          <p className="text-gray-400">
            Discover radio stations streaming music from YouTube
          </p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Radio className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demoStations.length}</p>
                <p className="text-sm text-gray-400">Total Stations</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveCount}</p>
                <p className="text-sm text-gray-400">Live Now</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalListeners.toLocaleString()}</p>
                <p className="text-sm text-gray-400">Listeners</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search & Filters */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stations..."
              className="w-full pl-12 pr-4 py-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('live')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'live'
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Live
            </button>
            <button
              onClick={() => setFilter('offline')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'offline'
                  ? 'bg-gray-500/20 text-gray-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Offline
            </button>
          </div>
        </div>
        
        {/* Stations Grid */}
        {filteredStations.length === 0 ? (
          <div className="text-center py-20">
            <Radio className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No stations found</h3>
            <p className="text-gray-400 mb-6">
              Try adjusting your search or create a new station
            </p>
            <Link
              href="/stations/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Create Station
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStations.map((station) => (
              <StationCard key={station.id} {...station} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
