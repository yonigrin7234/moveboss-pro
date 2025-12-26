import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Trip, TripWithLoads } from '../types';
import { useAuth } from '../providers/AuthProvider';
import { useDriver } from '../providers/DriverProvider';
import { useTripRealtimeSubscription } from './useRealtimeSubscription';
import { dataLogger } from '../lib/logger';

export function useDriverTrips() {
  const { user } = useAuth();
  const { driverId, ownerId, loading: driverLoading, error: driverError, isReady: driverReady } = useDriver();
  const tripsQuery = useQuery<Trip[]>({
    queryKey: ['driverTrips', user?.id, driverId, ownerId],
    enabled: driverReady && !!driverId && !!ownerId,
    queryFn: async () => {
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('driver_id', driverId!)
        .eq('owner_id', ownerId!)
        .order('start_date', { ascending: false });

      if (tripsError) {
        throw tripsError;
      }

      const result = tripsData || [];
      dataLogger.info(`Fetched ${result.length} trips`);
      return result;
    },
  });

  const trips = tripsQuery.data || [];
  const loading = driverLoading || tripsQuery.isLoading;
  const isRefreshing = tripsQuery.isRefetching;
  const error = driverError || (tripsQuery.error ? (tripsQuery.error as Error).message : null);
  const refetch = useCallback(async () => {
    await tripsQuery.refetch();
  }, [tripsQuery]);

  // Memoize return value to prevent unnecessary re-renders in consumers
  return useMemo(() => ({
    trips, loading, error, refetch, isRefreshing
  }), [trips, loading, error, refetch, isRefreshing]);
}

// Module-level cache for trip details
const tripDetailCache: Map<string, { data: TripWithLoads; fetchedForUser: string }> = new Map();
const tripDetailFetching: Set<string> = new Set();
// Track which trip+user combinations we've loaded from persistent cache
const tripDetailPersistentLoaded: Map<string, string> = new Map(); // tripId -> userId

export function useDriverTripDetail(tripId: string | null) {
  const { user } = useAuth();
  const { driverId, ownerId, loading: driverLoading, error: driverError, isReady: driverReady } = useDriver();
  const queryClient = useQueryClient();

  const tripQuery = useQuery<TripWithLoads | null>({
    queryKey: ['tripDetail', tripId, user?.id, driverId, ownerId],
    enabled: driverReady && !!driverId && !!ownerId && !!tripId,
    queryFn: async () => {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(`
          *,
          trucks:truck_id (id, unit_number, make, model, year, plate_number),
          trailers:trailer_id (id, unit_number, make, model, year, plate_number),
          trip_loads (
            id, trip_id, load_id, sequence_index, role,
            loads (*, companies:company_id (name, phone, trust_level))
          ),
          trip_expenses (*)
        `)
        .eq('id', tripId!)
        .single();

      if (tripError) throw tripError;

      if (tripData && driverId && tripData.driver_id !== driverId) {
        throw new Error('Access denied');
      }

      dataLogger.info(`Fetched trip ${tripId} detail`);
      return tripData;
    },
  });

  const trip = tripQuery.data || null;
  const loading = driverLoading || tripQuery.isLoading;
  const isRefreshing = tripQuery.isRefetching;
  const error = driverError || (tripQuery.error ? (tripQuery.error as Error).message : null);

  const refetch = useCallback(async () => {
    return await tripQuery.refetch();
  }, [tripQuery]);

  const silentRefetch = useCallback(() => {
    if (!tripId || !driverReady || !driverId || !ownerId) return;
    queryClient.invalidateQueries({ queryKey: ['tripDetail', tripId, user?.id, driverId, ownerId] });
  }, [queryClient, tripId, user?.id, driverReady, driverId, ownerId]);

  // Subscribe to realtime updates for this trip
  useTripRealtimeSubscription({
    tripId,
    ownerId,
    onDataChange: silentRefetch,
    enabled: !!tripId && !!ownerId,
  });

  // Memoize return value to prevent unnecessary re-renders in consumers
  return useMemo(() => ({
    trip, loading, error, refetch, isRefreshing
  }), [trip, loading, error, refetch, isRefreshing]);
}

export function useActiveTrip() {
  const { trips, loading, error, refetch, isRefreshing } = useDriverTrips();

  // Memoize derived values to prevent recalculation on every render
  const activeTrip = useMemo(
    () => trips.find(t => t.status === 'active' || t.status === 'en_route') || null,
    [trips]
  );
  const upcomingTrips = useMemo(
    () => trips.filter(t => t.status === 'planned'),
    [trips]
  );
  const recentTrips = useMemo(
    () => trips.filter(t => t.status === 'completed' || t.status === 'settled').slice(0, 5),
    [trips]
  );

  // Memoize return value to prevent unnecessary re-renders in consumers
  return useMemo(() => ({
    activeTrip,
    upcomingTrips,
    recentTrips,
    allTrips: trips,
    loading,
    error,
    refetch,
    isRefreshing,
  }), [activeTrip, upcomingTrips, recentTrips, trips, loading, error, refetch, isRefreshing]);
}
