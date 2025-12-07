import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Trip, TripWithLoads } from '../types';
import { useAuth } from '../providers/AuthProvider';
import {
  saveToCache,
  loadFromCache,
  CACHE_KEYS,
} from '../lib/offlineCache';
import { useTripRealtimeSubscription } from './useRealtimeSubscription';
import { dataLogger } from '../lib/logger';

// Module-level cache to persist across component mounts
const tripsCache: { data: Trip[] | null; fetchedForUser: string | null } = {
  data: null,
  fetchedForUser: null,
};

// Track which user we last loaded persistent cache for (per-user tracking)
let lastTripsListCacheLoadedForUser: string | null = null;

export function useDriverTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>(() =>
    tripsCache.fetchedForUser === user?.id ? (tripsCache.data || []) : []
  );
  const [loading, setLoading] = useState(() =>
    tripsCache.fetchedForUser !== user?.id
  );
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFetching = useRef(false);

  // Load from persistent cache on first mount (per-user)
  useEffect(() => {
    if (!user?.id) return;
    // Skip if we already loaded for this user
    if (lastTripsListCacheLoadedForUser === user.id) return;

    const loadPersistentCache = async () => {
      dataLogger.debug('Loading trips list from persistent cache');
      const cached = await loadFromCache<Trip[]>(CACHE_KEYS.TRIPS_LIST, user.id);
      if (cached && cached.length > 0) {
        tripsCache.data = cached;
        tripsCache.fetchedForUser = user.id;
        setTrips(cached);
        setLoading(false);
        dataLogger.info(`Loaded ${cached.length} trips from cache`);
      }
      lastTripsListCacheLoadedForUser = user.id;
    };

    loadPersistentCache();
  }, [user?.id]);

  const fetchTrips = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setTrips([]);
      return;
    }

    if (isFetching.current) return;

    // If we have cached data, show it but still refresh in background
    const hasCachedData = tripsCache.fetchedForUser === user.id && tripsCache.data;
    if (hasCachedData) {
      setTrips(tripsCache.data!);
      setLoading(false);
    }

    try {
      isFetching.current = true;
      if (!hasCachedData) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, owner_id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        if (!hasCachedData) {
          setError('Driver profile not found');
          setTrips([]);
        }
        return;
      }

      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('driver_id', driver.id)
        .eq('owner_id', driver.owner_id)
        .order('start_date', { ascending: false });

      if (tripsError) {
        throw tripsError;
      }

      const result = tripsData || [];
      tripsCache.data = result;
      tripsCache.fetchedForUser = user.id;
      setTrips(result);
      setError(null);

      // Save to persistent cache
      saveToCache(CACHE_KEYS.TRIPS_LIST, result, user.id);
      dataLogger.info(`Fetched ${result.length} trips`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trips';
      dataLogger.error('Trips fetch failed', err);
      // Only show error UI if we don't have cached data to show
      if (!hasCachedData) {
        setError(errorMessage);
        setTrips([]);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetching.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const refetch = useCallback(async () => {
    if (!user?.id) return;

    dataLogger.debug('Manual trips refetch triggered');
    // Reset fetch flag to allow new fetch, but DON'T clear cached data
    isFetching.current = false;
    setIsRefreshing(true);
    setError(null);
    fetchTrips();
  }, [user?.id, fetchTrips]);

  return { trips, loading, error, refetch, isRefreshing };
}

// Module-level cache for trip details
const tripDetailCache: Map<string, { data: TripWithLoads; fetchedForUser: string }> = new Map();
const tripDetailFetching: Set<string> = new Set();
// Track which trip+user combinations we've loaded from persistent cache
const tripDetailPersistentLoaded: Map<string, string> = new Map(); // tripId -> userId

export function useDriverTripDetail(tripId: string | null) {
  const { user } = useAuth();
  const cacheKey = tripId || '';

  const cachedData = tripDetailCache.get(cacheKey);
  const hasCachedData = cachedData && cachedData.fetchedForUser === user?.id;

  const [trip, setTrip] = useState<TripWithLoads | null>(() =>
    hasCachedData ? cachedData.data : null
  );
  const [loading, setLoading] = useState(() => !hasCachedData);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // Load from persistent cache (per-user)
  useEffect(() => {
    if (!user?.id || !tripId) return;
    // Skip if we already loaded for this trip+user combination
    if (tripDetailPersistentLoaded.get(tripId) === user.id) return;

    const loadPersistentCache = async () => {
      dataLogger.debug(`Loading trip ${tripId} from persistent cache`);
      const cached = await loadFromCache<TripWithLoads>(
        CACHE_KEYS.TRIP_DETAIL(tripId),
        user.id
      );
      if (cached) {
        tripDetailCache.set(tripId, { data: cached, fetchedForUser: user.id });
        setTrip(cached);
        setLoading(false);
        dataLogger.info(`Loaded trip ${tripId} from cache`);
      }
      tripDetailPersistentLoaded.set(tripId, user.id);
    };

    loadPersistentCache();
  }, [user?.id, tripId]);

  const fetchTripDetail = useCallback(async () => {
    if (!user?.id || !tripId) {
      setLoading(false);
      return;
    }

    if (tripDetailFetching.has(tripId)) return;

    const cached = tripDetailCache.get(tripId);
    const hasCached = cached && cached.fetchedForUser === user.id;

    if (hasCached) {
      setTrip(cached.data);
      setLoading(false);
    }

    try {
      tripDetailFetching.add(tripId);
      if (!hasCached) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, owner_id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        if (!hasCached) {
          setError('Driver profile not found');
        }
        return;
      }

      // Save owner ID for realtime subscription (only if changed)
      setOwnerId(prev => prev === driver.owner_id ? prev : driver.owner_id);

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
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      if (tripData && tripData.driver_id !== driver.id) {
        if (!hasCached) {
          setError('Access denied');
        }
        return;
      }

      tripDetailCache.set(tripId, { data: tripData, fetchedForUser: user.id });
      setTrip(tripData);
      setError(null);

      // Save to persistent cache
      saveToCache(CACHE_KEYS.TRIP_DETAIL(tripId), tripData, user.id);
      dataLogger.info(`Fetched trip ${tripId} detail`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trip';
      dataLogger.error(`Trip ${tripId} fetch failed`, err);
      // Only show error UI if we don't have cached data
      if (!hasCached) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      tripDetailFetching.delete(tripId);
      isFetchingRef.current = false;
    }
  }, [user?.id, tripId]);

  useEffect(() => {
    fetchTripDetail();
  }, [fetchTripDetail]);

  const refetch = useCallback(async () => {
    if (!tripId || !user?.id) return;

    dataLogger.debug(`Manual trip ${tripId} refetch triggered`);
    // Reset fetching flag to allow new fetch, but DON'T clear cached data
    tripDetailFetching.delete(tripId);
    setIsRefreshing(true);
    setError(null);
    fetchTripDetail();
  }, [tripId, user?.id, fetchTripDetail]);

  // Silent background refetch for realtime updates
  const silentRefetch = useCallback(() => {
    if (!tripId || !user?.id || isFetchingRef.current) return;
    dataLogger.debug(`Silent refetch for trip ${tripId}`);
    // Clear the fetching flag to allow a new fetch
    tripDetailFetching.delete(tripId);
    isFetchingRef.current = true;
    fetchTripDetail();
  }, [tripId, user?.id, fetchTripDetail]);

  // TEMPORARILY DISABLED - causing infinite re-render loops
  // TODO: Fix realtime subscription stability before re-enabling
  // useTripRealtimeSubscription({
  //   tripId,
  //   ownerId,
  //   onDataChange: silentRefetch,
  //   enabled: !!tripId && !!ownerId,
  // });

  return { trip, loading, error, refetch, isRefreshing };
}

export function useActiveTrip() {
  const { trips, loading, error, refetch, isRefreshing } = useDriverTrips();

  const activeTrip = trips.find(t => t.status === 'active' || t.status === 'en_route') || null;
  const upcomingTrips = trips.filter(t => t.status === 'planned');
  const recentTrips = trips
    .filter(t => t.status === 'completed' || t.status === 'settled')
    .slice(0, 5);

  return {
    activeTrip,
    upcomingTrips,
    recentTrips,
    allTrips: trips,
    loading,
    error,
    refetch,
    isRefreshing,
  };
}
