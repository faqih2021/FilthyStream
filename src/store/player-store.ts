import { create } from 'zustand'

export interface Track {
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

export interface QueueItem {
  id: string
  position: number
  status: 'PENDING' | 'PLAYING' | 'PLAYED' | 'SKIPPED'
  track: Track
}

interface PlayerState {
  // Current track
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  
  // Queue
  queue: QueueItem[]
  
  // Station
  currentStationId: string | null
  resumePosition: number | null // position to seek to after loading a track (resume on refresh)
  
  // Actions
  setCurrentTrack: (track: Track | null) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  setQueue: (queue: QueueItem[]) => void
  addToQueue: (item: QueueItem) => void
  removeFromQueue: (itemId: string) => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  clearQueue: () => void
  playNext: () => void
  playPrevious: () => void
  playTrack: (track: Track) => void
  setCurrentStationId: (stationId: string | null) => void
  setResumePosition: (position: number | null) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial state
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  queue: [],
  currentStationId: null,
  resumePosition: null,
  
  // Actions
  setCurrentTrack: (track) => set({ currentTrack: track }),
  
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  setCurrentTime: (time) => set({ currentTime: time }),
  
  setDuration: (duration) => set({ duration: duration }),
  
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  
  setQueue: (queue) => set({ queue }),
  
  addToQueue: (item) => set((state) => ({
    queue: [...state.queue, { ...item, position: state.queue.length }]
  })),
  
  removeFromQueue: (itemId) => set((state) => ({
    queue: state.queue
      .filter((item) => item.id !== itemId)
      .map((item, index) => ({ ...item, position: index }))
  })),
  
  reorderQueue: (fromIndex, toIndex) => set((state) => {
    const newQueue = [...state.queue]
    const [removed] = newQueue.splice(fromIndex, 1)
    newQueue.splice(toIndex, 0, removed)
    return {
      queue: newQueue.map((item, index) => ({ ...item, position: index }))
    }
  }),
  
  clearQueue: () => set({ queue: [] }),
  
  playNext: () => {
    const { queue, currentTrack } = get()
    const pendingTracks = queue.filter((item) => item.status === 'PENDING')
    
    if (pendingTracks.length > 0) {
      const nextItem = pendingTracks[0]
      set({
        currentTrack: nextItem.track,
        isPlaying: true,
        currentTime: 0,
        queue: queue.map((item) => 
          item.id === nextItem.id 
            ? { ...item, status: 'PLAYING' as const }
            : item.status === 'PLAYING'
            ? { ...item, status: 'PLAYED' as const }
            : item
        )
      })
    } else {
      set({ currentTrack: null, isPlaying: false })
    }
  },
  
  playPrevious: () => {
    const { queue } = get()
    const playedTracks = queue.filter((item) => item.status === 'PLAYED')
    
    if (playedTracks.length > 0) {
      const prevItem = playedTracks[playedTracks.length - 1]
      set({
        currentTrack: prevItem.track,
        isPlaying: true,
        currentTime: 0,
        queue: queue.map((item) => 
          item.id === prevItem.id 
            ? { ...item, status: 'PLAYING' as const }
            : item.status === 'PLAYING'
            ? { ...item, status: 'PENDING' as const }
            : item
        )
      })
    }
  },
  
  playTrack: (track) => set({
    currentTrack: track,
    isPlaying: true,
    currentTime: 0
  }),
  
  setCurrentStationId: (stationId) => set({ currentStationId: stationId }),
  setResumePosition: (position) => set({ resumePosition: position })
}))
