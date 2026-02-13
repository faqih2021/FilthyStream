'use client';

import { useRealtimeStations } from '@/hooks/use-realtime-stations';
import { Radio, Users, Play, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface BestStationsProps {
  limit?: number;
}

export function BestStations({ limit = 5 }: BestStationsProps) {
  const { stations, loading, error } = useRealtimeStations({
    limit,
    orderBy: 'play_count'
  });

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold">Top Stations</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold">Top Stations</h2>
        </div>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold">Top Stations</h2>
        </div>
        <p className="text-zinc-500 text-sm">No stations yet. Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-semibold">Top Stations</h2>
        <span className="ml-auto text-xs text-zinc-500">Live</span>
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </div>

      <div className="space-y-3">
        {stations.map((station, index) => (
          <Link
            key={station.id}
            href={`/stations/${station.id}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors group"
          >
            {/* Rank */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              index === 0 ? 'bg-yellow-500 text-black' :
              index === 1 ? 'bg-zinc-400 text-black' :
              index === 2 ? 'bg-amber-700 text-white' :
              'bg-zinc-700 text-zinc-400'
            }`}>
              {index + 1}
            </div>

            {/* Station Image */}
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
              {station.image_url ? (
                <img
                  src={station.image_url}
                  alt={station.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Radio className="w-5 h-5 text-white" />
              )}
            </div>

            {/* Station Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate group-hover:text-purple-400 transition-colors">
                {station.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  {station.play_count.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {station.listener_count}
                </span>
              </div>
            </div>

            {/* Live indicator */}
            {station.is_live && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                LIVE
              </span>
            )}
          </Link>
        ))}
      </div>

      <Link
        href="/stations"
        className="block mt-4 text-center text-sm text-purple-400 hover:text-purple-300 transition-colors"
      >
        View all stations →
      </Link>
    </div>
  );
}
