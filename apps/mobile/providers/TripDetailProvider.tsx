/**
 * TripDetailProvider - Shares trip data between parent and child routes
 *
 * This prevents multiple components from fetching the same trip data
 * independently, which was causing infinite loops.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TripWithLoads } from '../types';
import { useAuth } from './AuthProvider';

interface TripDetailContextType {
  trip: TripWithLoads | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TripDetailContext = createContext<TripDetailContextType | undefined>(undefined);

// Helper to add timeout to promises
// Uses PromiseLike<T> to support Supabase query builders which are Promise-like but not Promise types
function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

export function TripDetailProvider({
  tripId,
  children
}: {
  tripId: string | null;
  children: React.ReactNode;
}) {
  const [trip, setTrip] = useState<TripWithLoads | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Refs for stable callback
  const userIdRef = useRef(user?.id);
  const tripIdRef = useRef(tripId);
  const isFetchingRef = useRef(false);

  userIdRef.current = user?.id;
  tripIdRef.current = tripId;

  const fetchTrip = useCallback(async () => {
    const userId = userIdRef.current;
    const currentTripId = tripIdRef.current;

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    if (!userId || !currentTripId) {
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // Get driver record
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

      // Fetch trip with loads and expenses
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
          .eq('id', currentTripId)
          .single(),
        15000,
        'Connection timeout - please check your network'
      );

      const { data: tripData, error: tripError } = tripResult;

      if (tripError) {
        throw tripError;
      }

      // Verify this trip belongs to the driver
      if (tripData && tripData.driver_id !== driver.id) {
        setError('Access denied');
        return;
      }

      setTrip(tripData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trip');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Fetch when user.id or tripId changes
  useEffect(() => {
    if (user?.id && tripId) {
      fetchTrip();
    } else {
      setLoading(false);
    }
  }, [user?.id, tripId, fetchTrip]);

  return (
    <TripDetailContext.Provider value={{ trip, loading, error, refetch: fetchTrip }}>
      {children}
    </TripDetailContext.Provider>
  );
}

export function useTripDetailContext() {
  const context = useContext(TripDetailContext);
  if (context === undefined) {
    throw new Error('useTripDetailContext must be used within a TripDetailProvider');
  }
  return context;
}
