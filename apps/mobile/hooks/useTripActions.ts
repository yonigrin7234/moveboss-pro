import { useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TripStatus } from '../types';
import {
  notifyOwnerTripStarted,
  notifyOwnerTripCompleted,
} from '../lib/notify-owner';

export interface StartTripData {
  odometerStart: number;
  odometerStartPhotoUrl: string;
}

export interface CompleteTripData {
  odometerEnd: number;
  odometerEndPhotoUrl: string;
}

type ActionResult = { success: boolean; error?: string };

export function useTripActions(tripId: string, onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs for values that shouldn't trigger re-renders when accessed in callbacks
  const tripIdRef = useRef(tripId);
  const onSuccessRef = useRef(onSuccess);
  tripIdRef.current = tripId;
  onSuccessRef.current = onSuccess;

  const startTrip = useCallback(async (data: StartTripData): Promise<ActionResult> => {
    console.log('[useTripActions] startTrip called', { tripId: tripIdRef.current, odometerStart: data.odometerStart });
    setLoading(true);
    setError(null);

    try {
      console.log('[useTripActions] Updating trip in database...');
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          status: 'active' as TripStatus,
          start_date: new Date().toISOString(),
          odometer_start: data.odometerStart,
          odometer_start_photo_url: data.odometerStartPhotoUrl,
        })
        .eq('id', tripIdRef.current);

      if (updateError) {
        console.error('[useTripActions] Database update failed:', updateError);
        throw updateError;
      }

      console.log('[useTripActions] Database update successful');

      // Notify owner that trip started (fire-and-forget)
      notifyOwnerTripStarted(tripIdRef.current, data.odometerStart);

      onSuccessRef.current?.();
      console.log('[useTripActions] Returning success');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start trip';
      console.error('[useTripActions] Caught error:', message);
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const completeTrip = useCallback(async (data?: CompleteTripData): Promise<ActionResult> => {
    setLoading(true);
    setError(null);

    try {
      // If completing with odometer data
      const updatePayload: Record<string, unknown> = {
        status: 'completed' as TripStatus,
        end_date: new Date().toISOString(),
      };

      if (data) {
        updatePayload.odometer_end = data.odometerEnd;
        updatePayload.odometer_end_photo_url = data.odometerEndPhotoUrl;
      }

      const { error: updateError } = await supabase
        .from('trips')
        .update(updatePayload)
        .eq('id', tripIdRef.current);

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
