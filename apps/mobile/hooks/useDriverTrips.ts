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
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!user?.id || !tripId || hasFetched.current) return;

    hasFetched.current = true;
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

        setTrip(tripData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trip');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, tripId]);

  const refetch = useCallback(() => {
    hasFetched.current = false;
    setLoading(true);
    setError(null);
    // Trigger re-fetch by forcing a state update
    setTrip(null);
  }, []);

  // Re-fetch when trip is set to null by refetch()
  useEffect(() => {
    if (trip === null && !loading && hasFetched.current) {
      hasFetched.current = false;
    }
  }, [trip, loading]);

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
