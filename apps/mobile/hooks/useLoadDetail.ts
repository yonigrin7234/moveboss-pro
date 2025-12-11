import { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Load } from '../types';
import { useAuth } from '../providers/AuthProvider';
import { useDriver } from '../providers/DriverProvider';
import { realtimeManager } from '../lib/realtimeManager';

export function useLoadDetail(loadId: string | null) {
  const { user } = useAuth();
  const { driverId, ownerId, loading: driverLoading, error: driverError, isReady: driverReady } = useDriver();
  const tripIdRef = useRef<string | null>(null);

  const loadQuery = useQuery<Load | null>({
    queryKey: ['loadDetail', loadId, driverId],
    enabled: driverReady && !!driverId && !!loadId && !!user?.id,
    queryFn: async () => {
      if (driverError) {
        throw new Error(driverError);
      }

      if (!driverId) {
        throw new Error('Driver profile not found');
      }

      // First check if driver has access to this load via trip assignment
      const { data: tripLoadData, error: tripLoadError } = await supabase
        .from('trip_loads')
        .select(`
          trip_id,
          trips!inner (
            id,
            assigned_driver_id
          )
        `)
        .eq('load_id', loadId!)
        .eq('trips.assigned_driver_id', driverId)
        .limit(1)
        .maybeSingle();

      if (tripLoadError) {
        console.error('Trip load lookup error:', tripLoadError);
      }

      if (tripLoadData?.trip_id) {
        tripIdRef.current = tripLoadData.trip_id;
      }

      // Now fetch the load - driver has access if they're assigned to a trip containing this load
      // or if the load is owned by their company
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
        .single();

      if (loadError) {
        throw loadError;
      }

      // Verify access: either through trip assignment or owner match
      const hasTrip = !!tripLoadData?.trip_id;
      const isOwner = loadData?.owner_id === ownerId;

      if (!hasTrip && !isOwner) {
        throw new Error('You do not have access to this load');
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
