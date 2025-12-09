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

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { TripWithLoads } from '../types';
import { useAuth } from '../providers/AuthProvider';
import { useDriver } from '../providers/DriverProvider';
import { getNextAction, getAllPendingActions, NextAction } from '../lib/getNextAction';
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

export function useDriverDashboard(): DashboardData {
  const { user } = useAuth();
  const { driverId, ownerId, loading: driverLoading, error: driverError, isReady: driverReady } = useDriver();
  const queryClient = useQueryClient();
  const driverInfo = useMemo(() => (driverId && ownerId ? { driverId, ownerId } : null), [driverId, ownerId]);

  const dashboardQuery = useQuery<TripWithLoads[]>({
    queryKey: ['driverDashboard', user?.id, driverId, ownerId],
    enabled: driverReady && !!driverId && !!ownerId,
    queryFn: async () => {
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
        .eq('driver_id', driverId!)
        .eq('owner_id', ownerId!)
        .in('status', ['planned', 'active', 'en_route'])
        .order('start_date', { ascending: true });

      if (tripsError) {
        throw tripsError;
      }

      const result = trips || [];
      dataLogger.info(`Fetched ${result.length} trips for dashboard`);
      return result;
    },
  });

  const tripsWithLoads = dashboardQuery.data || [];

  const refetch = useCallback(async () => {
    await dashboardQuery.refetch();
  }, [dashboardQuery]);

  const silentRefetch = useCallback(() => {
    if (!driverReady || !driverId || !ownerId) return;
    queryClient.invalidateQueries({ queryKey: ['driverDashboard', user?.id, driverId, ownerId] });
  }, [queryClient, user?.id, driverReady, driverId, ownerId]);

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
  const loading = driverLoading || dashboardQuery.isLoading;
  const isRefreshing = dashboardQuery.isRefetching;
  const error = driverError || (dashboardQuery.error ? (dashboardQuery.error as Error).message : null);

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
