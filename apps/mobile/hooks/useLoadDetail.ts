import { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Load } from '../types';
import { useAuth } from '../providers/AuthProvider';
import { useDriver } from '../providers/DriverProvider';
import { realtimeManager } from '../lib/realtimeManager';

export function useLoadDetail(loadId: string | null) {
  const { user } = useAuth();
  const { ownerId, loading: driverLoading, error: driverError, isReady: driverReady } = useDriver();
  const tripIdRef = useRef<string | null>(null);

  const loadQuery = useQuery<Load | null>({
    queryKey: ['loadDetail', loadId, ownerId],
    enabled: driverReady && !!ownerId && !!loadId && !!user?.id,
    queryFn: async () => {
      if (driverError) {
        throw new Error(driverError);
      }

      if (!ownerId) {
        throw new Error('Driver profile not found');
      }

      const { data: loadData, error: loadError } = await supabase
        .from('loads')
        .select(`
          *,
          companies:company_id (
            name,
            phone,
            email,
            trust_level
          )
        `)
        .eq('id', loadId!)
        .eq('owner_id', ownerId)
        .single();

      if (loadError) {
        throw loadError;
      }

      const { data: tripLoadData } = await supabase
        .from('trip_loads')
        .select('trip_id')
        .eq('load_id', loadId!)
        .single();

      if (tripLoadData) {
        tripIdRef.current = tripLoadData.trip_id;
      }

      return loadData;
    },
  });

  // Real-time subscription for delivery order changes
  const load = loadQuery.data || null;
  const loading = driverLoading || loadQuery.isLoading;
  const error = driverError || (loadQuery.error ? (loadQuery.error as Error).message : null);
  const refetch = loadQuery.refetch;

  const tripId = tripIdRef.current;

  useEffect(() => {
    if (!loadId || !user?.id) return;

    const subs: string[] = [];

    subs.push(
      realtimeManager.subscribe({
        table: 'loads',
        event: 'UPDATE',
        filter: `id=eq.${loadId}`,
        callback: () => refetch(),
      }),
    );

    if (tripId) {
      subs.push(
        realtimeManager.subscribe({
          table: 'trips',
          event: 'UPDATE',
          filter: `id=eq.${tripId}`,
          callback: () => refetch(),
        }),
      );
    }

    return () => {
      subs.forEach((id) => realtimeManager.unsubscribe(id));
    };
  }, [loadId, user?.id, tripId, refetch]);

  return { load, loading, error, refetch };
}
