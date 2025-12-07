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
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeLogger } from '../lib/logger';

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
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDataChangeRef = useRef(onDataChange);
  const debounceRef = useRef(debounceMs);

  // Keep refs updated without causing re-renders or effect re-runs
  onDataChangeRef.current = onDataChange;
  debounceRef.current = debounceMs;

  useEffect(() => {
    if (!enabled || !driverId || !ownerId) {
      return;
    }

    // Create a unique channel name
    const channelName = `driver-updates-${driverId}`;
    realtimeLogger.info(`Subscribing to ${channelName}`);

    // Stable handler that reads from refs
    const handleChange = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        realtimeLogger.debug(`Realtime change detected, triggering refetch`);
        onDataChangeRef.current();
      }, debounceRef.current);
    };

    // Subscribe to trips and loads changes
    // NOTE: We only subscribe to trips (filtered by driver) and loads (filtered by owner)
    // We removed the unfiltered trip_loads subscription which was receiving ALL changes
    // across the entire database, causing excessive refetches and flickering
    const channel = supabase
      .channel(channelName)
      // Listen to trip changes for this driver
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `driver_id=eq.${driverId}`,
        },
        handleChange
      )
      // Listen to load status changes for this owner
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loads',
          filter: `owner_id=eq.${ownerId}`,
        },
        handleChange
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channelRef.current) {
        realtimeLogger.debug(`Unsubscribing from ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
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
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDataChangeRef = useRef(onDataChange);
  const debounceRef = useRef(debounceMs);

  // Keep refs updated without causing re-renders or effect re-runs
  onDataChangeRef.current = onDataChange;
  debounceRef.current = debounceMs;

  useEffect(() => {
    if (!enabled || !tripId || !ownerId) {
      return;
    }

    const channelName = `trip-updates-${tripId}`;
    realtimeLogger.info(`Subscribing to ${channelName}`);

    // Stable handler that reads from refs
    const handleChange = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        realtimeLogger.debug(`Realtime change detected for trip ${tripId}, triggering refetch`);
        onDataChangeRef.current();
      }, debounceRef.current);
    };

    const channel = supabase
      .channel(channelName)
      // Listen to this specific trip
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        handleChange
      )
      // Listen to trip_loads for this trip
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_loads',
          filter: `trip_id=eq.${tripId}`,
        },
        handleChange
      )
      // Listen to loads changes for this owner
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loads',
          filter: `owner_id=eq.${ownerId}`,
        },
        handleChange
      )
      // Listen to trip expenses
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_expenses',
          filter: `trip_id=eq.${tripId}`,
        },
        handleChange
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channelRef.current) {
        realtimeLogger.debug(`Unsubscribing from ${channelName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, tripId, ownerId]); // Removed handleChange - now defined inside effect
}

export default useDriverRealtimeSubscription;
