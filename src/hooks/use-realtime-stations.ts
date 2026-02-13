'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Station {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_live: boolean;
  is_public: boolean;
  play_count: number;
  listener_count: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface UseRealtimeStationsOptions {
  limit?: number;
  orderBy?: 'play_count' | 'created_at' | 'listener_count';
}

export function useRealtimeStations(options: UseRealtimeStationsOptions = {}) {
  const { limit = 10, orderBy = 'play_count' } = options;
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  const fetchStations = useCallback(async () => {
    try {
      const { data, error: fetchError } = await getSupabase()
        .from('stations')
        .select('*')
        .eq('is_public', true)
        .order(orderBy, { ascending: false })
        .limit(limit);

      if (fetchError) {
        // Handle case where table doesn't exist yet
        if (fetchError.code === '42P01' || fetchError.message?.includes('does not exist')) {
          console.warn('Stations table not found. Please run the SQL schema in Supabase.');
          setStations([]);
          setError(null);
          return;
        }
        throw fetchError;
      }
      setStations(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching stations:', err);
      setStations([]);
      setError(null); // Don't show error to user for missing tables
    } finally {
      setLoading(false);
    }
  }, [limit, orderBy]);

  useEffect(() => {
    fetchStations();

    // Subscribe to realtime changes
    const channel: RealtimeChannel = getSupabase()
      .channel('stations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stations',
          filter: 'is_public=eq.true'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setStations((prev) => {
              const newStations = [payload.new as Station, ...prev];
              // Re-sort and limit
              return newStations
                .sort((a, b) => {
                  const aVal = a[orderBy];
                  const bVal = b[orderBy];
                  if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return bVal - aVal;
                  }
                  return String(bVal).localeCompare(String(aVal));
                })
                .slice(0, limit);
            });
          } else if (payload.eventType === 'UPDATE') {
            setStations((prev) => {
              const updated = prev.map((s) =>
                s.id === payload.new.id ? (payload.new as Station) : s
              );
              // Re-sort after update (play_count might have changed)
              return updated.sort((a, b) => {
                if (orderBy === 'play_count' || orderBy === 'listener_count') {
                  return (b[orderBy] as number) - (a[orderBy] as number);
                }
                return new Date(b[orderBy] as string).getTime() - new Date(a[orderBy] as string).getTime();
              });
            });
          } else if (payload.eventType === 'DELETE') {
            setStations((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [fetchStations, limit, orderBy]);

  return { stations, loading, error, refetch: fetchStations };
}

// Hook for tracking listener presence on a station
export function useStationPresence(stationId: string | null) {
  const [listenerCount, setListenerCount] = useState(0);

  useEffect(() => {
    if (!stationId) return;

    const channel = getSupabase().channel(`station:${stationId}`, {
      config: {
        presence: {
          key: 'listeners'
        }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setListenerCount(count);
        
        // Update listener count in database
        updateListenerCount(stationId, count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: 'anonymous', joined_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.untrack();
      getSupabase().removeChannel(channel);
    };
  }, [stationId]);

  return listenerCount;
}

async function updateListenerCount(stationId: string, count: number) {
  try {
    await getSupabase()
      .from('stations')
      .update({ listener_count: count })
      .eq('id', stationId);
  } catch (err) {
    console.error('Error updating listener count:', err);
  }
}
