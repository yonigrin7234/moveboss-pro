/**
 * LocationTrackingManager
 *
 * Invisible component that manages automatic location tracking.
 * Should be mounted inside DriverProvider to access driver context.
 *
 * - Automatically starts tracking when driver has an active trip
 * - Automatically stops when no active trips
 * - Handles app state changes (foreground/background)
 * - Syncs cached locations when online
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDriver } from '../providers/DriverProvider';
import { useAuth } from '../providers/AuthProvider';
import {
  startLocationTracking,
  stopLocationTracking,
  setTrackingContext,
  clearTrackingContext,
  syncCachedLocations,
  isLocationTrackingActive,
} from '../services/locationTracking';
import { supabase } from '../lib/supabase';
import { createLogger } from '../lib/logger';

const logger = createLogger('LocationTrackingManager');

export function LocationTrackingManager() {
  const { user } = useAuth();
  const { driver, driverId, ownerId, isReady } = useDriver();
  const appState = useRef(AppState.currentState);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  /**
   * Check for active trips assigned to this driver
   */
  const checkForActiveTrips = async (): Promise<string | null> => {
    if (!driverId) return null;

    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id')
        .eq('driver_id', driverId)
        .in('status', ['active', 'en_route'])
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('Error checking active trips', error);
        return null;
      }

      return data?.id || null;
    } catch (e) {
      logger.error('Exception checking active trips', e);
      return null;
    }
  };

  /**
   * Initialize tracking when driver is ready
   */
  useEffect(() => {
    if (!isReady || !driverId || !ownerId || isInitialized.current) {
      return;
    }

    let mounted = true;

    const initTracking = async () => {
      try {
        // Check if location sharing is enabled (default to true if not set)
        const locationSharingEnabled = driver?.location_sharing_enabled !== false;

        // Check for active trips
        const activeTripId = await checkForActiveTrips();

        if (!mounted) return;

        // Set tracking context
        await setTrackingContext({
          driverId,
          ownerId,
          tripId: activeTripId,
          locationSharingEnabled,
        });

        if (activeTripId && locationSharingEnabled) {
          // Start tracking if not already running
          const isActive = await isLocationTrackingActive();
          if (!isActive) {
            const success = await startLocationTracking();
            if (success) {
              logger.info('Location tracking started automatically', { activeTripId });
            }
          }
        }

        // Sync any cached locations
        const synced = await syncCachedLocations();
        if (synced > 0) {
          logger.info(`Synced ${synced} cached locations`);
        }

        isInitialized.current = true;
      } catch (e) {
        logger.error('Failed to initialize tracking', e);
      }
    };

    initTracking();

    return () => {
      mounted = false;
    };
  }, [isReady, driverId, ownerId, driver?.location_sharing_enabled]);

  /**
   * Periodic check for trip status changes
   */
  useEffect(() => {
    if (!isReady || !driverId) return;

    const checkAndManageTracking = async () => {
      const locationSharingEnabled = driver?.location_sharing_enabled !== false;
      const activeTripId = await checkForActiveTrips();
      const isActive = await isLocationTrackingActive();

      // Update trip ID in context
      await setTrackingContext({
        driverId,
        ownerId: ownerId!,
        tripId: activeTripId,
        locationSharingEnabled,
      });

      if (activeTripId && locationSharingEnabled && !isActive) {
        // Trip became active, start tracking
        const success = await startLocationTracking();
        if (success) {
          logger.info('Tracking started due to active trip', { activeTripId });
        }
      } else if (!activeTripId && isActive) {
        // No more active trips, stop tracking
        await stopLocationTracking();
        logger.info('Tracking stopped - no active trips');
      }
    };

    // Check immediately on mount
    checkAndManageTracking();

    // Then check every minute
    checkIntervalRef.current = setInterval(checkAndManageTracking, 60000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isReady, driverId, ownerId, driver?.location_sharing_enabled]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - sync cached locations
        const synced = await syncCachedLocations();
        if (synced > 0) {
          logger.info(`Synced ${synced} cached locations on resume`);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Cleanup on logout
   */
  useEffect(() => {
    if (!user) {
      // User logged out - clear tracking context
      clearTrackingContext();
      isInitialized.current = false;
    }
  }, [user]);

  // This component renders nothing
  return null;
}
