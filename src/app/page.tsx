'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AppLayout } from '@/components/app-layout'
import { AddTrackForm } from '@/components/add-track-form'
import { usePlayerStore } from '@/store/player-store'
import { parseUrl } from '@/lib/url-parser'

export default function Home() {
  const [isAddingTrack, setIsAddingTrack] = useState(false)
  const { addToQueue, queue } = usePlayerStore()
  
  const handleAddTrack = async (url: string) => {
    setIsAddingTrack(true)
    
    try {
      const parsed = parseUrl(url)
      if (!parsed) throw new Error('Invalid URL')
      
      // Fetch metadata from YouTube API
      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      let trackData = {
        title: 'YouTube Track',
        artist: 'Unknown Artist',
        album: null,
        duration: null,
        imageUrl: null
      }
      
      if (response.ok) {
        const data = await response.json()
        if (data.track) {
          trackData = {
            title: data.track.title,
            artist: data.track.artist,
            album: data.track.album,
            duration: data.track.duration,
            imageUrl: data.track.imageUrl
          }
        }
      }
      
      addToQueue({
        id: crypto.randomUUID(),
        position: queue.length,
        status: 'PENDING',
        track: {
          id: crypto.randomUUID(),
          title: trackData.title,
          artist: trackData.artist,
          album: trackData.album,
          duration: trackData.duration,
          imageUrl: trackData.imageUrl,
          sourceType: 'YOUTUBE' as const,
          sourceId: parsed.id,
          sourceUrl: url
        }
      })
    } finally {
      setIsAddingTrack(false)
    }
  }
  
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-8">
        {/* 1. Hero Section - Stream music from YouTube */}
        <section className="mb-12">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 p-12">
            <div className="relative z-10">
              <h1 className="text-5xl font-bold mb-4">
                Stream Music from
                <br />
                <span className="gradient-text">YouTube</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-xl">
                Create your own radio station with YouTube music.
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
                  My Stations
                </Link>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/30 to-transparent rounded-full blur-3xl" />
          </div>
        </section>
        
        {/* 2. How It Works */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-purple-400">1</span>
              </div>
              <h3 className="font-bold text-lg mb-2">Paste YouTube Links</h3>
              <p className="text-gray-400">
                Copy YouTube URLs and paste them directly into FilthyStream
              </p>
            </div>
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-pink-400">2</span>
              </div>
              <h3 className="font-bold text-lg mb-2">Build Your Queue</h3>
              <p className="text-gray-400">
                Add tracks to your station and build the perfect lineup
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

        {/* 3. Quick Add to Queue */}
        <section className="mb-12">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Quick Add to Queue</h2>
            <p className="text-gray-400 mb-6">
              Paste a YouTube URL to instantly add it to your queue
            </p>
            <AddTrackForm onAddTrack={handleAddTrack} isLoading={isAddingTrack} />
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
