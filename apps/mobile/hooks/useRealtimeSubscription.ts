/**
 * useRealtimeSubscription - Real-time data updates via Supabase
 *
 * Subscribes to database changes so drivers see updates instantly
 * when dispatchers make changes to trips or loads.
 *
 * Features:
 * - Automatic subscription management
 * - Debounced refetch to avoid rapid updates
 * - Clean unsubscribe on unmount
 * - Stable subscriptions that don't recreate unnecessarily
 */

import { useEffect, useRef } from 'react';
import { realtimeLogger } from '../lib/logger';
import { realtimeManager } from '../lib/realtimeManager';

interface UseRealtimeOptions {
  /** Driver ID to filter subscriptions */
  driverId: string | null;
  /** Owner ID for RLS filtering */
  ownerId: string | null;
  /** Callback when data changes */
  onDataChange: () => void;
  /** Whether subscription is enabled */
  enabled?: boolean;
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
}

/**
 * Subscribe to real-time updates for a driver's trips and loads
 */
export function useDriverRealtimeSubscription({
  driverId,
  ownerId,
  onDataChange,
  enabled = true,
  debounceMs = 500,
}: UseRealtimeOptions) {
  const driverSubRef = useRef<string | null>(null);
  const loadSubRef = useRef<string | null>(null);
  const onDataChangeRef = useRef(onDataChange);
  const debounceRef = useRef(debounceMs);

  // Keep refs updated without causing re-renders or effect re-runs
  onDataChangeRef.current = onDataChange;
  debounceRef.current = debounceMs;

  useEffect(() => {
    if (!enabled || !driverId || !ownerId) {
      return;
    }

    const handle = () => {
      realtimeLogger.debug(`Realtime change detected, triggering refetch`);
      onDataChangeRef.current();
    };

    driverSubRef.current = realtimeManager.subscribe({
      table: 'trips',
      filter: `driver_id=eq.${driverId}`,
      event: '*',
      debounceMs: debounceRef.current,
      callback: handle,
    });

    loadSubRef.current = realtimeManager.subscribe({
      table: 'loads',
      filter: `owner_id=eq.${ownerId}`,
      event: 'UPDATE',
      debounceMs: debounceRef.current,
      callback: handle,
    });

    return () => {
      if (driverSubRef.current) realtimeManager.unsubscribe(driverSubRef.current);
      if (loadSubRef.current) realtimeManager.unsubscribe(loadSubRef.current);
      driverSubRef.current = null;
      loadSubRef.current = null;
    };
  }, [enabled, driverId, ownerId]); // Removed handleChange - now defined inside effect
}

/**
 * Subscribe to real-time updates for a specific trip
 */
export function useTripRealtimeSubscription({
  tripId,
  ownerId,
  onDataChange,
  enabled = true,
  debounceMs = 300,
}: {
  tripId: string | null;
  ownerId: string | null;
  onDataChange: () => void;
  enabled?: boolean;
  debounceMs?: number;
}) {
  const subsRef = useRef<string[]>([]);
  const onDataChangeRef = useRef(onDataChange);
  const debounceRef = useRef(debounceMs);

  // Keep refs updated without causing re-renders or effect re-runs
  onDataChangeRef.current = onDataChange;
  debounceRef.current = debounceMs;

  useEffect(() => {
    if (!enabled || !tripId || !ownerId) {
      return;
    }

    const handle = () => {
      realtimeLogger.debug(`Realtime change detected for trip ${tripId}, triggering refetch`);
      onDataChangeRef.current();
    };

    const subs: string[] = [];

    subs.push(
      realtimeManager.subscribe({
        table: 'trips',
        filter: `id=eq.${tripId}`,
        event: '*',
        debounceMs: debounceRef.current,
        callback: handle,
      }),
    );

    subs.push(
      realtimeManager.subscribe({
        table: 'trip_loads',
        filter: `trip_id=eq.${tripId}`,
        event: '*',
        debounceMs: debounceRef.current,
        callback: handle,
      }),
    );

    subs.push(
      realtimeManager.subscribe({
        table: 'loads',
        filter: `owner_id=eq.${ownerId}`,
        event: 'UPDATE',
        debounceMs: debounceRef.current,
        callback: handle,
      }),
    );

    subs.push(
      realtimeManager.subscribe({
        table: 'trip_expenses',
        filter: `trip_id=eq.${tripId}`,
        event: '*',
        debounceMs: debounceRef.current,
        callback: handle,
      }),
    );

    subsRef.current = subs;

    return () => {
      subsRef.current.forEach((id) => realtimeManager.unsubscribe(id));
      subsRef.current = [];
    };
  }, [enabled, tripId, ownerId]); // Removed handleChange - now defined inside effect
}

export default useDriverRealtimeSubscription;
