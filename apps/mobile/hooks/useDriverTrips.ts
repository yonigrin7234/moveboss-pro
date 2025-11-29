import { useState, useEffect, useCallback } from 'react';
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

export function useDriverTripDetail(tripId: string | null) {
  const [trip, setTrip] = useState<TripWithLoads | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTrip = useCallback(async () => {
    if (!user || !tripId) {
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

      // Fetch trip with loads and expenses
      // Note: RLS policies should handle access control, so we only filter by trip ID
      // The driver_id/owner_id check is redundant if RLS is working
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(`
          *,
          trucks:truck_id (
            id,
            unit_number,
            make,
            model,
            year,
            license_plate
          ),
          trailers:trailer_id (
            id,
            unit_number,
            make,
            model,
            year,
            license_plate
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
        .single();

      if (tripError) {
        console.error('Trip fetch error:', tripError.message, tripError.code, tripError.details);
        throw tripError;
      }

      // Verify this trip belongs to the driver (in case RLS isn't applied yet)
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
  }, [user, tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  return { trip, loading, error, refetch: fetchTrip };
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
