'use client'

import { Radio, Users, Play, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface StationCardProps {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  isLive: boolean
  listenersCount?: number
  ownerName?: string
}

export function StationCard({
  id,
  name,
  description,
  imageUrl,
  isLive,
  listenersCount = 0,
  ownerName
}: StationCardProps) {
  return (
    <Link
      href={`/stations/${id}`}
      className="group block bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all hover:scale-[1.02]"
    >
      {/* Image */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-900/50 to-pink-900/50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Radio className="w-16 h-16 text-purple-500/50" />
          </div>
        )}
        
        {/* Live Badge */}
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
        
        {/* Listeners Count */}
        {listenersCount > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-xs rounded-full">
            <Users className="w-3 h-3" />
            {listenersCount}
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-lg truncate group-hover:text-purple-400 transition-colors">
          {name}
        </h3>
        {description && (
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {description}
          </p>
        )}
        {ownerName && (
          <p className="text-xs text-gray-500 mt-2">
            by {ownerName}
          </p>
        )}
      </div>
    </Link>
  )
}

// Skeleton loader for station cards
export function StationCardSkeleton() {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-800" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-800 rounded w-3/4" />
        <div className="h-4 bg-gray-800 rounded w-full" />
        <div className="h-3 bg-gray-800 rounded w-1/4" />
      </div>
    </div>
  )
}
