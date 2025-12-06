import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Trip, TripWithLoads, TripExpense } from '../types';
import { useAuth } from '../providers/AuthProvider';

// Module-level cache to persist across component mounts
const tripsCache: { data: Trip[] | null; fetchedForUser: string | null } = {
  data: null,
  fetchedForUser: null,
};

export function useDriverTrips() {
  // Initialize from cache if available for current user
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>(() =>
    tripsCache.fetchedForUser === user?.id ? (tripsCache.data || []) : []
  );
  const [loading, setLoading] = useState(() =>
    tripsCache.fetchedForUser !== user?.id
  );
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  useEffect(() => {
    // Skip if already fetched for this user or currently fetching
    if (!user?.id || isFetching.current || tripsCache.fetchedForUser === user.id) {
      if (tripsCache.fetchedForUser === user?.id && tripsCache.data) {
        setTrips(tripsCache.data);
        setLoading(false);
      }
      return;
    }

    isFetching.current = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        // First get the driver record for this auth user
        const { data: driver, error: driverError } = await supabase
          .from('drivers')
          .select('id, owner_id')
          .eq('auth_user_id', user.id)
          .single();

        if (driverError || !driver) {
          setError('Driver profile not found');
          setTrips([]);
          tripsCache.data = [];
          tripsCache.fetchedForUser = user.id;
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

        console.log('[useDriverTrips] Fetched trips:', tripsData?.length);
        const result = tripsData || [];
        tripsCache.data = result;
        tripsCache.fetchedForUser = user.id;
        setTrips(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trips');
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    };

    fetchData();
  }, [user?.id]);

  const refetch = useCallback(() => {
    if (!user?.id) return;
    // Clear cache to allow refetch
    tripsCache.fetchedForUser = null;
    tripsCache.data = null;
    isFetching.current = false;
    setLoading(true);
    setError(null);
    // The useEffect will re-run on next render since cache is cleared
  }, [user?.id]);

  return { trips, loading, error, refetch };
}

// Module-level cache for trip details to persist across component mounts
const tripDetailCache: Map<string, { data: TripWithLoads; fetchedForUser: string }> = new Map();
const tripDetailFetching: Set<string> = new Set();

export function useDriverTripDetail(tripId: string | null) {
  const { user } = useAuth();
  const cacheKey = tripId || '';

  // Initialize from cache if available
  const cachedData = tripDetailCache.get(cacheKey);
  const hasCachedData = cachedData && cachedData.fetchedForUser === user?.id;

  const [trip, setTrip] = useState<TripWithLoads | null>(() =>
    hasCachedData ? cachedData.data : null
  );
  const [loading, setLoading] = useState(() => !hasCachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !tripId) return;

    // Check cache
    const cached = tripDetailCache.get(tripId);
    if (cached && cached.fetchedForUser === user.id) {
      setTrip(cached.data);
      setLoading(false);
      return;
    }

    // Check if already fetching
    if (tripDetailFetching.has(tripId)) return;

    tripDetailFetching.add(tripId);
    setLoading(true);

    const fetchData = async () => {
      try {
        // Get driver record first
        const { data: driver, error: driverError } = await supabase
          .from('drivers')
          .select('id, owner_id')
          .eq('auth_user_id', user.id)
          .single();

        if (driverError || !driver) {
          setError('Driver profile not found');
          return;
        }

        // Fetch trip with all relations
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

        // Verify access
        if (tripData && tripData.driver_id !== driver.id) {
          setError('Access denied');
          return;
        }

        // Cache the result
        tripDetailCache.set(tripId, { data: tripData, fetchedForUser: user.id });
        setTrip(tripData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trip');
      } finally {
        setLoading(false);
        tripDetailFetching.delete(tripId);
      }
    };

    fetchData();
  }, [user?.id, tripId]);

  const refetch = useCallback(() => {
    if (!tripId || !user?.id) return;
    // Clear cache for this trip to allow refetch
    tripDetailCache.delete(tripId);
    tripDetailFetching.delete(tripId);
    setLoading(true);
    setError(null);
    setTrip(null);
  }, [tripId, user?.id]);

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
