import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Trip, TripWithLoads } from '../types';
import { useAuth } from '../providers/AuthProvider';
import {
  saveToCache,
  loadFromCache,
  clearCache,
  CACHE_KEYS,
} from '../lib/offlineCache';
import { useTripRealtimeSubscription } from './useRealtimeSubscription';

// Module-level cache to persist across component mounts
const tripsCache: { data: Trip[] | null; fetchedForUser: string | null } = {
  data: null,
  fetchedForUser: null,
};

// Track if we've loaded from AsyncStorage
let persistentCacheLoaded = false;

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

  // Load from persistent cache on first mount
  useEffect(() => {
    if (!user?.id || persistentCacheLoaded) return;

    const loadPersistentCache = async () => {
      const cached = await loadFromCache<Trip[]>(CACHE_KEYS.TRIPS_LIST, user.id);
      if (cached && cached.length > 0) {
        tripsCache.data = cached;
        tripsCache.fetchedForUser = user.id;
        setTrips(cached);
        setLoading(false);
      }
      persistentCacheLoaded = true;
    };

    loadPersistentCache();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || isFetching.current) return;

    // If we have cached data, show it but still refresh in background
    const hasCachedData = tripsCache.fetchedForUser === user.id && tripsCache.data;
    if (hasCachedData) {
      setTrips(tripsCache.data!);
      setLoading(false);
    }

    isFetching.current = true;
    if (!hasCachedData) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const fetchData = async () => {
      try {
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
      } catch (err) {
        if (!hasCachedData) {
          setError(err instanceof Error ? err.message : 'Failed to fetch trips');
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        isFetching.current = false;
      }
    };

    fetchData();
  }, [user?.id]);

  const refetch = useCallback(async () => {
    if (!user?.id) return;

    // Clear caches
    tripsCache.fetchedForUser = null;
    tripsCache.data = null;
    isFetching.current = false;
    await clearCache(CACHE_KEYS.TRIPS_LIST);

    setLoading(true);
    setError(null);
  }, [user?.id]);

  return { trips, loading, error, refetch, isRefreshing };
}

// Module-level cache for trip details
const tripDetailCache: Map<string, { data: TripWithLoads; fetchedForUser: string }> = new Map();
const tripDetailFetching: Set<string> = new Set();
const tripDetailPersistentLoaded: Set<string> = new Set();

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

  // Load from persistent cache
  useEffect(() => {
    if (!user?.id || !tripId || tripDetailPersistentLoaded.has(tripId)) return;

    const loadPersistentCache = async () => {
      const cached = await loadFromCache<TripWithLoads>(
        CACHE_KEYS.TRIP_DETAIL(tripId),
        user.id
      );
      if (cached) {
        tripDetailCache.set(tripId, { data: cached, fetchedForUser: user.id });
        setTrip(cached);
        setLoading(false);
      }
      tripDetailPersistentLoaded.add(tripId);
    };

    loadPersistentCache();
  }, [user?.id, tripId]);

  useEffect(() => {
    if (!user?.id || !tripId) return;

    const cached = tripDetailCache.get(tripId);
    const hasCached = cached && cached.fetchedForUser === user.id;

    if (hasCached) {
      setTrip(cached.data);
      setLoading(false);
    }

    if (tripDetailFetching.has(tripId)) return;

    tripDetailFetching.add(tripId);
    if (!hasCached) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const fetchData = async () => {
      try {
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

        // Save owner ID for realtime subscription
        setOwnerId(driver.owner_id);

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
      } catch (err) {
        if (!hasCached) {
          setError(err instanceof Error ? err.message : 'Failed to fetch trip');
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        tripDetailFetching.delete(tripId);
      }
    };

    fetchData();
  }, [user?.id, tripId]);

  const refetch = useCallback(async () => {
    if (!tripId || !user?.id) return;

    tripDetailCache.delete(tripId);
    tripDetailFetching.delete(tripId);
    tripDetailPersistentLoaded.delete(tripId);
    await clearCache(CACHE_KEYS.TRIP_DETAIL(tripId));

    setLoading(true);
    setError(null);
    setTrip(null);
  }, [tripId, user?.id]);

  // Silent background refetch for realtime updates
  const silentRefetch = useCallback(() => {
    if (!tripId || !user?.id || isFetchingRef.current) return;
    // Clear the fetching flag to allow a new fetch
    tripDetailFetching.delete(tripId);
    isFetchingRef.current = true;
    // This will trigger the useEffect to re-run
    setIsRefreshing(true);
  }, [tripId, user?.id]);

  // Subscribe to realtime updates for this trip
  useTripRealtimeSubscription({
    tripId,
    ownerId,
    onDataChange: silentRefetch,
    enabled: !!tripId && !!ownerId,
  });

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
