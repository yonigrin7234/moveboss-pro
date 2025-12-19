import { useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TripStatus } from '../types';
import {
  notifyOwnerTripStarted,
  notifyOwnerTripCompleted,
} from '../lib/notify-owner';
import { useDriver } from '../providers/DriverProvider';
import { dataLogger } from '../lib/logger';

export interface StartTripData {
  odometerStart: number;
  odometerStartPhotoUrl: string;
}

export interface CompleteTripData {
  odometerEnd: number;
  odometerEndPhotoUrl: string;
}

// Type for trip_loads query result with nested load data
// Supabase returns joined data as arrays even for single relations
interface TripLoadWithStatus {
  load_id: string;
  loads: Array<{
    id: string;
    load_status: string;
  }>;
}

type ActionResult = { success: boolean; error?: string };

export function useTripActions(tripId: string, onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { driverId, ownerId, isReady, error: driverError } = useDriver();

  // Use refs for values that shouldn't trigger re-renders when accessed in callbacks
  const tripIdRef = useRef(tripId);
  const onSuccessRef = useRef(onSuccess);
  tripIdRef.current = tripId;
  onSuccessRef.current = onSuccess;

  const startTrip = useCallback(async (data: StartTripData): Promise<ActionResult> => {
    setLoading(true);
    setError(null);

    try {
      if (driverError) {
        throw new Error(driverError);
      }
      if (!isReady || !driverId || !ownerId) {
        throw new Error('Driver profile not found');
      }

      dataLogger.info('Starting trip', { tripId: tripIdRef.current, odometerStart: data.odometerStart });

      const { error: updateError } = await supabase
        .from('trips')
        .update({
          status: 'active' as TripStatus,
          start_date: new Date().toISOString(),
          odometer_start: data.odometerStart,
          odometer_start_photo_url: data.odometerStartPhotoUrl,
        })
        .eq('id', tripIdRef.current)
        .eq('owner_id', ownerId);

      if (updateError) {
        throw updateError;
      }

      dataLogger.info('Trip started successfully', { tripId: tripIdRef.current, newStatus: 'active' });

      // Notify owner that trip started (fire-and-forget)
      notifyOwnerTripStarted(tripIdRef.current, data.odometerStart);

      onSuccessRef.current?.();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start trip';
      setError(message);
      dataLogger.error('Start trip failed', err);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const completeTrip = useCallback(async (data?: CompleteTripData): Promise<ActionResult> => {
    setLoading(true);
    setError(null);

    try {
      if (driverError) {
        throw new Error(driverError);
      }
      if (!isReady || !driverId || !ownerId) {
        throw new Error('Driver profile not found');
      }

      if (!data || data.odometerEnd === undefined || data.odometerEnd === null || Number.isNaN(data.odometerEnd)) {
        return { success: false, error: 'Ending odometer is required' };
      }

      // Ensure all loads are delivered before completing the trip
      const { data: tripLoads, error: loadsError } = await supabase
        .from('trip_loads')
        .select(`
          load_id,
          loads:load_id (
            id,
            load_status
          )
        `)
        .eq('trip_id', tripIdRef.current);

      if (loadsError) {
        throw loadsError;
      }

      const hasUndelivered = (tripLoads as TripLoadWithStatus[] || []).some((tl) => {
        // Supabase returns joined data as array - get first element
        const status = tl.loads?.[0]?.load_status;
        return status !== 'delivered' && status !== 'storage_completed';
      });

      if (hasUndelivered) {
        return { success: false, error: 'Complete all deliveries before finishing the trip' };
      }

      // If completing with odometer data
      const updatePayload: Record<string, unknown> = {
        status: 'completed' as TripStatus,
        end_date: new Date().toISOString(),
      };

      updatePayload.odometer_end = data.odometerEnd;
      updatePayload.odometer_end_photo_url = data.odometerEndPhotoUrl;

      const { error: updateError } = await supabase
        .from('trips')
        .update(updatePayload)
        .eq('id', tripIdRef.current)
        .eq('owner_id', ownerId);

      if (updateError) {
        throw updateError;
      }

      // Notify owner that trip completed (fire-and-forget)
      notifyOwnerTripCompleted(tripIdRef.current, data?.odometerEnd);

      onSuccessRef.current?.();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete trip';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Return stable object reference
  return useMemo(() => ({
    loading,
    error,
    startTrip,
    completeTrip,
  }), [loading, error, startTrip, completeTrip]);
}
