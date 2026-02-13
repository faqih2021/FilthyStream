'use client'

import { usePlayerStore, QueueItem } from '@/store/player-store'
import { formatDuration } from '@/lib/url-parser'
import { GripVertical, Play, Trash2, Radio, Music } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

export function Queue() {
  const { queue, currentTrack, removeFromQueue, playTrack, reorderQueue } = usePlayerStore()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
  }
  
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return
    reorderQueue(draggedIndex, dropIndex)
    setDraggedIndex(null)
  }
  
  const handleDragEnd = () => {
    setDraggedIndex(null)
  }
  
  const pendingTracks = queue.filter(item => item.status === 'PENDING')
  const playedTracks = queue.filter(item => item.status === 'PLAYED' || item.status === 'SKIPPED')
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-bold">Queue</h2>
        <p className="text-sm text-gray-400">{pendingTracks.length} tracks remaining</p>
      </div>
      
      {/* Now Playing */}
      {currentTrack && (
        <div className="p-4 border-b border-[var(--border)]">
          <p className="text-xs text-purple-400 uppercase font-semibold mb-2">Now Playing</p>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
              {currentTrack.imageUrl ? (
                <Image
                  src={currentTrack.imageUrl}
                  alt={currentTrack.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{currentTrack.title}</p>
              <p className="text-sm text-gray-400 truncate">{currentTrack.artist || 'Unknown'}</p>
            </div>
            <span className="text-xs text-gray-500">
              {formatDuration(currentTrack.duration)}
            </span>
          </div>
        </div>
      )}
      
      {/* Queue List */}
      <div className="flex-1 overflow-y-auto">
        {pendingTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <Radio className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-center">Queue is empty</p>
            <p className="text-sm text-center mt-1">Add tracks from YouTube</p>
          </div>
        ) : (
          <div className="p-2">
            <p className="text-xs text-gray-400 uppercase font-semibold px-2 py-2">Next Up</p>
            {pendingTracks.map((item, index) => (
              <QueueItemRow
                key={item.id}
                item={item}
                index={index}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onPlay={() => playTrack(item.track)}
                onRemove={() => removeFromQueue(item.id)}
                isDragging={draggedIndex === index}
              />
            ))}
          </div>
        )}
        
        {/* History */}
        {playedTracks.length > 0 && (
          <div className="p-2 border-t border-[var(--border)]">
            <p className="text-xs text-gray-400 uppercase font-semibold px-2 py-2">Recently Played</p>
            {playedTracks.slice(-5).reverse().map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg opacity-50"
              >
                <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                  {item.track.imageUrl ? (
                    <Image
                      src={item.track.imageUrl}
                      alt={item.track.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.track.title}</p>
                  <p className="text-xs text-gray-500 truncate">{item.track.artist || 'Unknown'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface QueueItemRowProps {
  item: QueueItem
  index: number
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onPlay: () => void
  onRemove: () => void
  isDragging: boolean
}

function QueueItemRow({
  item,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onPlay,
  onRemove,
  isDragging
}: QueueItemRowProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2 p-2 rounded-lg group hover:bg-white/5 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      <div className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4" />
      </div>
      
      <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-800 flex-shrink-0 group">
        {item.track.imageUrl ? (
          <Image
            src={item.track.imageUrl}
            alt={item.track.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-4 h-4 text-gray-500" />
          </div>
        )}
        <button
          onClick={onPlay}
          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Play className="w-4 h-4 text-white" />
        </button>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.track.title}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400 truncate">{item.track.artist || 'Unknown'}</p>
          <span className="w-2 h-2 rounded-full bg-red-500" />
        </div>
      </div>
      
      <span className="text-xs text-gray-500">
        {formatDuration(item.track.duration)}
      </span>
      
      <button
        onClick={onRemove}
        className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
