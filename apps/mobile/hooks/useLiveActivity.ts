/**
 * useLiveActivity Hook
 *
 * Manages iOS Live Activities for trip progress display.
 * Shows trip status on Lock Screen and Dynamic Island.
 *
 * Features:
 * - Automatically starts activity when trip becomes active
 * - Updates activity when load status changes
 * - Ends activity when trip is completed
 * - Gracefully handles unsupported devices (Android, older iOS)
 */

import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  areLiveActivitiesEnabled,
  startLiveActivity,
  updateLiveActivity,
  stopLiveActivity,
  isLiveActivityRunning,
  TripActivityAttributes,
  TripActivityContentState,
} from '../modules/activity-controller';
import { TripLoad, LoadStatus, TripStatus } from '../types';

interface UseLiveActivityParams {
  tripId: string;
  tripName: string;
  tripStatus: TripStatus;
  loads: TripLoad[];
  currentLoadIndex: number | null;
}

interface UseLiveActivityReturn {
  isSupported: boolean;
  isActive: boolean;
  start: () => Promise<void>;
  update: (state: Partial<TripActivityContentState>) => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Get a human-readable status label from LoadStatus
 */
function getStatusLabel(status: LoadStatus): string {
  switch (status) {
    case 'pending':
      return 'Ready to Start';
    case 'accepted':
      return 'Accepted';
    case 'loading':
      return 'Loading';
    case 'loaded':
      return 'Loaded';
    case 'in_transit':
      return 'In Transit';
    case 'delivered':
      return 'Delivered';
    case 'storage_completed':
      return 'Complete';
    default:
      return 'In Progress';
  }
}

/**
 * Calculate progress through the trip based on loads
 */
function calculateProgress(loads: TripLoad[], currentLoadIndex: number | null): number {
  if (loads.length === 0) return 0;

  const completedLoads = loads.filter(
    (tl) => tl.loads.load_status === 'delivered' || tl.loads.load_status === 'storage_completed'
  ).length;

  // Base progress from completed loads
  let progress = completedLoads / loads.length;

  // If there's a current load in progress, add partial progress
  if (currentLoadIndex !== null && currentLoadIndex < loads.length) {
    const currentLoad = loads[currentLoadIndex];
    const status = currentLoad?.loads.load_status || 'pending';

    // Add partial progress based on status
    const statusProgress: Record<LoadStatus, number> = {
      pending: 0,
      accepted: 0.1,
      loading: 0.3,
      loaded: 0.5,
      in_transit: 0.7,
      delivered: 1,
      storage_completed: 1,
    };

    const loadProgress = statusProgress[status] || 0;
    progress += loadProgress / loads.length;
  }

  return Math.min(progress, 1);
}

/**
 * Get location string from load
 */
function getLocationString(
  load: TripLoad['loads'],
  type: 'pickup' | 'delivery'
): string {
  if (type === 'pickup') {
    return (
      [load.pickup_city, load.pickup_state].filter(Boolean).join(', ') || 'TBD'
    );
  }
  const city = load.dropoff_city || load.delivery_city;
  const state = load.dropoff_state || load.delivery_state;
  return [city, state].filter(Boolean).join(', ') || 'TBD';
}

export function useLiveActivity({
  tripId,
  tripName,
  tripStatus,
  loads,
  currentLoadIndex,
}: UseLiveActivityParams): UseLiveActivityReturn {
  const activityIdRef = useRef<string | null>(null);
  const isSupported = Platform.OS === 'ios' && areLiveActivitiesEnabled;

  // Find the current load
  const currentLoad = currentLoadIndex !== null ? loads[currentLoadIndex] : loads[0];
  const loadStatus = (currentLoad?.loads.load_status || 'pending') as LoadStatus;

  // Build the current content state
  const buildContentState = useCallback(
    (overrides?: Partial<TripActivityContentState>): TripActivityContentState => {
      return {
        currentStatus: loadStatus,
        statusLabel: getStatusLabel(loadStatus),
        progress: calculateProgress(loads, currentLoadIndex),
        eta: undefined, // Could be calculated from location data
        distance: undefined, // Could be calculated from location data
        ...overrides,
      };
    },
    [loadStatus, loads, currentLoadIndex]
  );

  // Start a new Live Activity
  const start = useCallback(async () => {
    if (!isSupported || !currentLoad) return;

    // Don't start if already running
    if (isLiveActivityRunning()) {
      return;
    }

    const attributes: TripActivityAttributes = {
      tripId,
      tripName,
      loadNumber: currentLoad.loads.load_number || `Load ${(currentLoadIndex || 0) + 1}`,
      pickupLocation: getLocationString(currentLoad.loads, 'pickup'),
      deliveryLocation: getLocationString(currentLoad.loads, 'delivery'),
      totalLoads: loads.length,
      currentLoadIndex: (currentLoadIndex || 0) + 1,
    };

    try {
      const result = await startLiveActivity({
        attributes,
        contentState: buildContentState(),
      });
      activityIdRef.current = result.activityId;
    } catch (error) {
      console.warn('Failed to start Live Activity:', error);
    }
  }, [
    isSupported,
    tripId,
    tripName,
    currentLoad,
    currentLoadIndex,
    loads.length,
    buildContentState,
  ]);

  // Update the current Live Activity
  const update = useCallback(
    async (overrides?: Partial<TripActivityContentState>) => {
      if (!isSupported || !isLiveActivityRunning()) return;

      try {
        await updateLiveActivity({
          contentState: buildContentState(overrides),
        });
      } catch (error) {
        console.warn('Failed to update Live Activity:', error);
      }
    },
    [isSupported, buildContentState]
  );

  // Stop the current Live Activity
  const stop = useCallback(async () => {
    if (!isSupported || !isLiveActivityRunning()) return;

    try {
      await stopLiveActivity();
      activityIdRef.current = null;
    } catch (error) {
      console.warn('Failed to stop Live Activity:', error);
    }
  }, [isSupported]);

  // Auto-start when trip becomes active
  useEffect(() => {
    if (!isSupported) return;

    if (tripStatus === 'active' || tripStatus === 'en_route') {
      // Start if not already running
      if (!isLiveActivityRunning()) {
        start();
      }
    }
  }, [isSupported, tripStatus, start]);

  // Auto-update when load status changes
  useEffect(() => {
    if (!isSupported || !isLiveActivityRunning()) return;

    update();
  }, [isSupported, loadStatus, currentLoadIndex, update]);

  // Auto-stop when trip is completed
  useEffect(() => {
    if (!isSupported) return;

    if (tripStatus === 'completed' || tripStatus === 'settled') {
      stop();
    }
  }, [isSupported, tripStatus, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't stop on unmount - let the activity persist
    };
  }, []);

  return {
    isSupported,
    isActive: isSupported && isLiveActivityRunning(),
    start,
    update,
    stop,
  };
}

export default useLiveActivity;
