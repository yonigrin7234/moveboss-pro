import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Load } from '../types';
import { useAuth } from '../providers/AuthProvider';

export function useLoadDetail(loadId: string | null) {
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const tripIdRef = useRef<string | null>(null);

  const fetchLoad = useCallback(async () => {
    if (!user || !loadId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get driver record
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, owner_id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        setError('Driver profile not found');
        return;
      }

      // Fetch load with company info (including trust_level for delivery workflow)
      // Note: using companies:company_id to specify which FK to use (loads has both company_id and assigned_carrier_id)
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
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id)
        .single();

      if (loadError) {
        throw loadError;
      }

      setLoad(loadData);

      // Get the trip ID for this load (for real-time subscription)
      const { data: tripLoadData } = await supabase
        .from('trip_loads')
        .select('trip_id')
        .eq('load_id', loadId)
        .single();

      if (tripLoadData) {
        tripIdRef.current = tripLoadData.trip_id;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch load');
    } finally {
      setLoading(false);
    }
  }, [user, loadId]);

  useEffect(() => {
    fetchLoad();
  }, [fetchLoad]);

  // Real-time subscription for delivery order changes
  useEffect(() => {
    if (!loadId) return;

    // Subscribe to changes on this load (delivery_order changes)
    const loadChannel = supabase
      .channel(`load-${loadId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loads',
          filter: `id=eq.${loadId}`,
        },
        () => {
          // Refetch when load changes (including delivery_order)
          fetchLoad();
        }
      )
      .subscribe();

    // Subscribe to trip changes (current_delivery_index changes)
    // We'll set this up after we know the trip ID
    let tripChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupTripSubscription = () => {
      if (tripIdRef.current) {
        tripChannel = supabase
          .channel(`trip-${tripIdRef.current}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'trips',
              filter: `id=eq.${tripIdRef.current}`,
            },
            () => {
              // Refetch when trip changes (including current_delivery_index)
              fetchLoad();
            }
          )
          .subscribe();
      }
    };

    // Set up trip subscription after a brief delay to let fetchLoad complete
    const timeoutId = setTimeout(setupTripSubscription, 1000);

    return () => {
      clearTimeout(timeoutId);
      loadChannel.unsubscribe();
      if (tripChannel) {
        tripChannel.unsubscribe();
      }
    };
  }, [loadId, fetchLoad]);

  return { load, loading, error, refetch: fetchLoad };
}
