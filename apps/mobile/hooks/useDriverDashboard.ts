/**
 * useDriverDashboard - Dashboard-specific data hook
 *
 * Fetches all data needed for the driver dashboard:
 * - Trips with loads (for smart action calculation)
 * - Today's stats (earnings, miles, loads)
 * - Quick access to active trip
 *
 * Features offline caching for instant load on app restart.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TripWithLoads } from '../types';
import { useAuth } from '../providers/AuthProvider';
import { getNextAction, getAllPendingActions, NextAction } from '../lib/getNextAction';
import {
  saveToCache,
  loadFromCache,
  CACHE_KEYS,
} from '../lib/offlineCache';
import { useDriverRealtimeSubscription } from './useRealtimeSubscription';
import { dataLogger } from '../lib/logger';

interface DashboardStats {
  todayEarnings: number;
  todayMiles: number;
  loadsCompleted: number;
  loadsTotal: number;
}

interface DashboardData {
  // Smart action
  nextAction: NextAction;
  pendingActions: NextAction[];
  // Trip data
  activeTrip: TripWithLoads | null;
  upcomingTrips: TripWithLoads[];
  tripsWithLoads: TripWithLoads[];
  // Stats
  stats: DashboardStats;
  // State
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  refetch: () => Promise<void>;
}

// Module-level cache with per-user tracking
const dashboardCache: { data: TripWithLoads[] | null; fetchedForUser: string | null } = {
  data: null,
  fetchedForUser: null,
};
// Track which user we last loaded persistent cache for (prevents re-loading on every mount)
let lastPersistentCacheLoadedForUser: string | null = null;

export function useDriverDashboard(): DashboardData {
  const { user } = useAuth();
  const [tripsWithLoads, setTripsWithLoads] = useState<TripWithLoads[]>(() =>
    dashboardCache.fetchedForUser === user?.id ? (dashboardCache.data || []) : []
  );
  const [loading, setLoading] = useState(() =>
    dashboardCache.fetchedForUser !== user?.id
  );
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFetchingRef = useRef(false);
  const [driverInfo, setDriverInfo] = useState<{ driverId: string; ownerId: string } | null>(null);

  // Load from persistent cache on first mount (per-user)
  useEffect(() => {
    if (!user?.id) return;
    // Skip if we already loaded for this user
    if (lastPersistentCacheLoadedForUser === user.id) return;

    const loadPersistentCache = async () => {
      dataLogger.debug('Loading dashboard from persistent cache');
      const cached = await loadFromCache<TripWithLoads[]>(CACHE_KEYS.DASHBOARD, user.id);
      if (cached && cached.length > 0) {
        dashboardCache.data = cached;
        dashboardCache.fetchedForUser = user.id;
        setTripsWithLoads(cached);
        setLoading(false);
        dataLogger.info(`Loaded ${cached.length} trips from cache`);
      }
      lastPersistentCacheLoadedForUser = user.id;
    };

    loadPersistentCache();
  }, [user?.id]);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setTripsWithLoads([]);
      return;
    }

    if (isFetchingRef.current) {
      return;
    }

    const hasCachedData = dashboardCache.fetchedForUser === user.id && dashboardCache.data;
    if (hasCachedData) {
      setTripsWithLoads(dashboardCache.data!);
      setLoading(false);
    }

    try {
      isFetchingRef.current = true;
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
          setTripsWithLoads([]);
        }
        return;
      }

      // Save driver info for realtime subscription (only if changed)
      setDriverInfo(prev => {
        if (prev?.driverId === driver.id && prev?.ownerId === driver.owner_id) {
          return prev; // No change, return same reference
        }
        return { driverId: driver.id, ownerId: driver.owner_id };
      });

      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select(`
          *,
          trucks:truck_id (
            id,
            unit_number,
            make,
            model,
            year,
            plate_number
          ),
          trailers:trailer_id (
            id,
            unit_number,
            make,
            model,
            year,
            plate_number
          ),
          trip_loads (
            id,
            trip_id,
            load_id,
            sequence_index,
            role,
            loads (
              *,
              companies:company_id (
                name,
                phone,
                trust_level
              )
            )
          ),
          trip_expenses (*)
        `)
        .eq('driver_id', driver.id)
        .eq('owner_id', driver.owner_id)
        .in('status', ['planned', 'active', 'en_route'])
        .order('start_date', { ascending: true });

      if (tripsError) {
        throw tripsError;
      }

      const result = trips || [];
      dashboardCache.data = result;
      dashboardCache.fetchedForUser = user.id;
      setTripsWithLoads(result);
      setError(null);

      // Save to persistent cache
      saveToCache(CACHE_KEYS.DASHBOARD, result, user.id);
      dataLogger.info(`Fetched ${result.length} trips for dashboard`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      dataLogger.error('Dashboard fetch failed', err);
      // Only show error UI if we don't have cached data to show
      if (!hasCachedData) {
        setError(errorMessage);
        setTripsWithLoads([]);
      }
      // If we have cached data, silently fail - user still sees old data
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refetch = useCallback(async () => {
    if (!user?.id) return;

    dataLogger.debug('Manual refetch triggered');
    // Reset fetch flag to allow new fetch, but DON'T clear cached data
    // The fetch will update cache on success; on failure, old data remains
    isFetchingRef.current = false;
    setIsRefreshing(true);
    setError(null);
    fetchDashboardData();
  }, [user?.id, fetchDashboardData]);

  // Silent background refetch for realtime updates (doesn't clear cache or show loading)
  const silentRefetch = useCallback(() => {
    if (!user?.id || isFetchingRef.current) return;
    // Just trigger a background fetch - will show as isRefreshing
    fetchDashboardData();
  }, [user?.id, fetchDashboardData]);

  // Subscribe to realtime updates for trips and loads
  useDriverRealtimeSubscription({
    driverId: driverInfo?.driverId || null,
    ownerId: driverInfo?.ownerId || null,
    onDataChange: silentRefetch,
    enabled: !!driverInfo,
  });

  // Calculate derived data
  const activeTrip = useMemo(() => {
    return tripsWithLoads.find(
      (t) => t.status === 'active' || t.status === 'en_route'
    ) || null;
  }, [tripsWithLoads]);

  const upcomingTrips = useMemo(() => {
    return tripsWithLoads.filter((t) => t.status === 'planned');
  }, [tripsWithLoads]);

  const nextAction = useMemo(() => {
    return getNextAction(tripsWithLoads);
  }, [tripsWithLoads]);

  const pendingActions = useMemo(() => {
    return getAllPendingActions(tripsWithLoads);
  }, [tripsWithLoads]);

  const stats = useMemo((): DashboardStats => {
    let todayEarnings = 0;
    let todayMiles = 0;
    let loadsCompleted = 0;
    let loadsTotal = 0;

    for (const trip of tripsWithLoads) {
      if (trip.status === 'active' || trip.status === 'en_route') {
        for (const tl of trip.trip_loads) {
          loadsTotal++;
          if (tl.loads.load_status === 'delivered') {
            loadsCompleted++;
            todayEarnings += tl.loads.amount_collected_on_delivery || 0;
          }
        }

        if (trip.odometer_start && trip.odometer_end) {
          todayMiles = trip.odometer_end - trip.odometer_start;
        } else if (trip.actual_miles) {
          todayMiles = trip.actual_miles;
        }
      }
    }

    return {
      todayEarnings,
      todayMiles,
      loadsCompleted,
      loadsTotal,
    };
  }, [tripsWithLoads]);

  // Memoize return value to prevent unnecessary re-renders in consumers
  return useMemo(() => ({
    nextAction,
    pendingActions,
    activeTrip,
    upcomingTrips,
    tripsWithLoads,
    stats,
    loading,
    error,
    isRefreshing,
    refetch,
  }), [nextAction, pendingActions, activeTrip, upcomingTrips, tripsWithLoads, stats, loading, error, isRefreshing, refetch]);
}

export default useDriverDashboard;
