'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Radio, ArrowLeft, ImagePlus, Loader2, Globe, Lock } from 'lucide-react'

export default function CreateStationPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    isPublic: true
  })
  const [error, setError] = useState('')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.name.trim()) {
      setError('Station name is required')
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/stations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create station')
      }
      
      const data = await response.json()
      router.push(`/stations/${data.station.id}`)
    } catch (err) {
      setError('Failed to create station. Please try again.')
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
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
      </header>
      
      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Radio Station</h1>
          <p className="text-gray-400">
            Set up your station and start streaming music from YouTube
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Station Image */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
            <label className="block text-sm font-medium mb-4">Station Cover <span className="text-gray-500 font-normal">(Optional)</span></label>
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden">
                {formData.imageUrl ? (
                  <img
                    src={formData.imageUrl}
                    alt="Station cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImagePlus className="w-8 h-8 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="Paste image URL..."
                  className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Recommended size: 800x800 pixels. Leave empty for default gradient.
                </p>
              </div>
            </div>
          </div>
          
          {/* Station Details */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Station Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Awesome Radio Station"
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.name.length}/50 characters</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your radio station..."
                rows={3}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/200 characters</p>
            </div>
          </div>
          
          {/* Visibility */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
            <label className="block text-sm font-medium mb-4">Visibility</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: true })}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  formData.isPublic
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-[var(--border)] hover:border-gray-600'
                }`}
              >
                <Globe className={`w-5 h-5 ${formData.isPublic ? 'text-purple-400' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium">Public</p>
                  <p className="text-xs text-gray-400">Anyone can find and listen</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: false })}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  !formData.isPublic
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-[var(--border)] hover:border-gray-600'
                }`}
              >
                <Lock className={`w-5 h-5 ${!formData.isPublic ? 'text-purple-400' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium">Private</p>
                  <p className="text-xs text-gray-400">Only people with link</p>
                </div>
              </button>
            </div>
          </div>
          
          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400">
              {error}
            </div>
          )}
          
          {/* Submit */}
          <div className="flex gap-4">
            <Link
              href="/"
              className="flex-1 py-4 rounded-xl border border-[var(--border)] text-center font-semibold hover:bg-white/5 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Station'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
