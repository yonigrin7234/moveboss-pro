import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Trip, TripWithLoads, TripExpense } from '../types';
import { useAuth } from '../providers/AuthProvider';

export function useDriverTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTrips = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First get the driver record for this auth user
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, owner_id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        setError('Driver profile not found');
        setTrips([]);
        return;
      }

      // Fetch trips assigned to this driver
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('driver_id', driver.id)
        .eq('owner_id', driver.owner_id)
        .order('start_date', { ascending: false });

      if (tripsError) {
        throw tripsError;
      }

      setTrips(tripsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trips');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return { trips, loading, error, refetch: fetchTrips };
}

// Helper to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

export function useDriverTripDetail(tripId: string | null) {
  const [trip, setTrip] = useState<TripWithLoads | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Refs to prevent infinite loops and concurrent fetches
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);

  // Create a stable fetch function using useRef
  const fetchTripRef = useRef<() => Promise<void>>();

  fetchTripRef.current = async () => {
    const userId = user?.id;

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    if (!userId || !tripId) {
      setLoading(false);
      return;
    }

    // Create a unique key for this fetch
    const fetchKey = `${userId}-${tripId}`;

    // Skip if we already fetched with this exact key and have data
    if (lastFetchKeyRef.current === fetchKey && trip) {
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // Get driver record with timeout
      const driverResult = await withTimeout(
        supabase
          .from('drivers')
          .select('id, owner_id')
          .eq('auth_user_id', userId)
          .single(),
        10000,
        'Connection timeout - please check your network'
      );

      const { data: driver, error: driverError } = driverResult;

      if (driverError || !driver) {
        setError('Driver profile not found');
        return;
      }

      // Fetch trip with loads and expenses with timeout
      const tripResult = await withTimeout(
        supabase
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
          .eq('id', tripId)
          .single(),
        15000,
        'Connection timeout - please check your network'
      );

      const { data: tripData, error: tripError } = tripResult;

      if (tripError) {
        throw tripError;
      }

      // Verify this trip belongs to the driver (in case RLS isn't applied yet)
      if (tripData && tripData.driver_id !== driver.id) {
        setError('Access denied');
        return;
      }

      lastFetchKeyRef.current = fetchKey;
      setTrip(tripData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trip');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Stable refetch function
  const refetch = useCallback(() => {
    lastFetchKeyRef.current = null; // Clear to allow re-fetch
    fetchTripRef.current?.();
  }, []);

  // Only fetch when user.id or tripId changes - NO function in deps
  useEffect(() => {
    if (user?.id && tripId) {
      fetchTripRef.current?.();
    } else {
      setLoading(false);
    }
  }, [user?.id, tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { trip, loading, error, refetch };
}

export function useActiveTrip() {
  const { trips, loading, error, refetch } = useDriverTrips();

  // Find the active or en_route trip
  const activeTrip = trips.find(t => t.status === 'active' || t.status === 'en_route') || null;

  // Find upcoming planned trips
  const upcomingTrips = trips.filter(t => t.status === 'planned');

  // Find recent completed/settled trips
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
  };
}
