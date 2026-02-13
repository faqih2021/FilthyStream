'use client'

import { useState } from 'react'
import { parseUrl, isValidUrl } from '@/lib/url-parser'
import { Plus, Link as LinkIcon, Loader2, Music, AlertCircle } from 'lucide-react'

interface AddTrackFormProps {
  onAddTrack: (url: string) => Promise<void>
  isLoading?: boolean
}

export function AddTrackForm({ onAddTrack, isLoading = false }: AddTrackFormProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }
    
    if (!isValidUrl(url)) {
      setError('Invalid URL. Please enter a valid Spotify or YouTube URL')
      return
    }
    
    try {
      await onAddTrack(url)
      setUrl('')
    } catch (err) {
      setError('Failed to add track. Please try again.')
    }
  }
  
  const parsedUrl = url ? parseUrl(url) : null
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <LinkIcon className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError('')
          }}
          placeholder="Paste Spotify or YouTube URL..."
          className="w-full pl-12 pr-4 py-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          disabled={isLoading}
        />
        {parsedUrl && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {parsedUrl.type === 'SPOTIFY' ? (
              <span className="text-xs px-2 py-1 rounded-full bg-[#1db954]/20 text-[#1db954]">
                Spotify {parsedUrl.contentType}
              </span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-500">
                YouTube {parsedUrl.contentType}
              </span>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      <button
        type="submit"
        disabled={isLoading || !url.trim()}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" />
            Add to Queue
          </>
        )}
      </button>
      
      {/* Supported Platforms */}
      <div className="flex items-center justify-center gap-6 pt-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1db954]/20 flex items-center justify-center">
            <Music className="w-4 h-4 text-[#1db954]" />
          </div>
          <span>Spotify</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <span>YouTube</span>
        </div>
      </div>
    </form>
  )
}
