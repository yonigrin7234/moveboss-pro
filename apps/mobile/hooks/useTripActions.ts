import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TripStatus } from '../types';

export function useTripActions(tripId: string, onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (newStatus: TripStatus) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          status: newStatus,
          // Set start_date when starting trip
          ...(newStatus === 'active' && { start_date: new Date().toISOString() }),
          // Set end_date when completing trip
          ...(newStatus === 'completed' && { end_date: new Date().toISOString() }),
        })
        .eq('id', tripId);

      if (updateError) {
        throw updateError;
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trip status');
    } finally {
      setLoading(false);
    }
  };

  const startTrip = () => updateStatus('active');
  const completeTrip = () => updateStatus('completed');

  return {
    loading,
    error,
    startTrip,
    completeTrip,
    updateStatus,
  };
}
