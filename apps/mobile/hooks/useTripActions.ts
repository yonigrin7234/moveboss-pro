import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TripStatus } from '../types';

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

  const startTrip = async (data: StartTripData): Promise<ActionResult> => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          status: 'active' as TripStatus,
          start_date: new Date().toISOString(),
          odometer_start: data.odometerStart,
          odometer_start_photo_url: data.odometerStartPhotoUrl,
        })
        .eq('id', tripId);

      if (updateError) {
        throw updateError;
      }

      onSuccess?.();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start trip';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const completeTrip = async (data?: CompleteTripData): Promise<ActionResult> => {
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
        .eq('id', tripId);

      if (updateError) {
        throw updateError;
      }

      onSuccess?.();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete trip';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    startTrip,
    completeTrip,
  };
}
