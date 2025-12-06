/**
 * useDriverDashboard - Dashboard-specific data hook
 *
 * Fetches all data needed for the driver dashboard:
 * - Trips with loads (for smart action calculation)
 * - Today's stats (earnings, miles, loads)
 * - Quick access to active trip
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TripWithLoads } from '../types';
import { useAuth } from '../providers/AuthProvider';
import { getNextAction, getAllPendingActions, NextAction } from '../lib/getNextAction';

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
  refetch: () => Promise<void>;
}

export function useDriverDashboard(): DashboardData {
  const [tripsWithLoads, setTripsWithLoads] = useState<TripWithLoads[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setTripsWithLoads([]);
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
        setTripsWithLoads([]);
        setLoading(false);
        return;
      }

      // Fetch all non-settled/cancelled trips with their loads
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

      setTripsWithLoads(trips || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setTripsWithLoads([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
    // Calculate today's stats from active trip
    let todayEarnings = 0;
    let todayMiles = 0;
    let loadsCompleted = 0;
    let loadsTotal = 0;

    for (const trip of tripsWithLoads) {
      if (trip.status === 'active' || trip.status === 'en_route') {
        // Sum up loads
        for (const tl of trip.trip_loads) {
          loadsTotal++;
          if (tl.loads.load_status === 'delivered') {
            loadsCompleted++;
            // Add revenue from delivered loads
            todayEarnings += tl.loads.amount_collected_on_delivery || 0;
          }
        }

        // Calculate miles if both odometer readings available
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

  return {
    nextAction,
    pendingActions,
    activeTrip,
    upcomingTrips,
    tripsWithLoads,
    stats,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}

export default useDriverDashboard;
