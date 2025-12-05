/**
 * useLocationTracking Hook
 * Manages GPS location tracking for driver load matching
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import {
  startLocationTracking,
  stopLocationTracking,
  isLocationTrackingActive,
  getCurrentLocationWithAddress,
  syncCachedLocations,
  setTrackingContext,
  clearTrackingContext,
  getTrackingContext,
} from '../services/locationTracking';

interface LocationInfo {
  lat: number;
  lng: number;
  city?: string | null;
  state?: string | null;
  updatedAt: Date;
}

interface UseLocationTrackingReturn {
  // State
  isTracking: boolean;
  isEnabled: boolean;
  lastLocation: LocationInfo | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshLocation: () => Promise<void>;
  toggleLocationSharing: (enabled: boolean) => Promise<void>;
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<void>;
}

export function useLocationTracking(tripId?: string): UseLocationTrackingReturn {
  const { user } = useAuth();

  const [isTracking, setIsTracking] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  // Fetch driver info and settings
  useEffect(() => {
    const fetchDriverInfo = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get driver record for current user
        const { data: driver, error: driverError } = await supabase
          .from('drivers')
          .select('id, owner_id, location_sharing_enabled')
          .eq('auth_user_id', user.id)
          .single();

        if (driverError || !driver) {
          setError('Driver not found');
          setIsLoading(false);
          return;
        }

        setDriverId(driver.id);

        // Get trip-level override if tripId provided
        let shareLocation = driver.location_sharing_enabled || false;

        if (tripId) {
          const { data: trip } = await supabase
            .from('trips')
            .select('share_location, current_location_lat, current_location_lng, current_location_city, current_location_state, current_location_updated_at')
            .eq('id', tripId)
            .single();

          if (trip) {
            // Trip override takes precedence
            if (trip.share_location !== null) {
              shareLocation = trip.share_location;
            }

            // Set last known location from trip
            if (trip.current_location_lat && trip.current_location_lng) {
              setLastLocation({
                lat: trip.current_location_lat,
                lng: trip.current_location_lng,
                city: trip.current_location_city,
                state: trip.current_location_state,
                updatedAt: new Date(trip.current_location_updated_at || Date.now()),
              });
            }
          }
        }

        setIsEnabled(shareLocation);

        // Set tracking context
        await setTrackingContext({
          driverId: driver.id,
          ownerId: driver.owner_id,
          tripId: tripId || null,
          locationSharingEnabled: shareLocation,
        });

        // Check if tracking is active
        const active = await isLocationTrackingActive();
        setIsTracking(active);

        setIsLoading(false);
      } catch (e) {
        console.error('Error fetching driver info:', e);
        setError('Failed to load driver settings');
        setIsLoading(false);
      }
    };

    fetchDriverInfo();
  }, [user, tripId]);

  // Start/stop tracking based on enabled state
  useEffect(() => {
    const manageTracking = async () => {
      if (!driverId) return;

      if (isEnabled) {
        const success = await startLocationTracking();
        setIsTracking(success);

        // Sync any cached locations
        const synced = await syncCachedLocations();
        if (synced > 0) {
          console.log(`Synced ${synced} cached locations`);
        }
      } else {
        await stopLocationTracking();
        setIsTracking(false);
      }
    };

    manageTracking();
  }, [isEnabled, driverId]);

  // Handle app state changes (sync when coming to foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active' && isEnabled) {
        // Sync cached locations when app comes to foreground
        await syncCachedLocations();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't stop tracking on unmount - let background task continue
    };
  }, []);

  // Manual location refresh
  const refreshLocation = useCallback(async () => {
    setError(null);

    try {
      const location = await getCurrentLocationWithAddress();
      if (!location) {
        setError('Could not get location');
        return;
      }

      setLastLocation({
        lat: location.latitude,
        lng: location.longitude,
        city: location.city,
        state: location.state,
        updatedAt: new Date(),
      });

      // Update trip location if we have a tripId
      if (tripId) {
        await supabase
          .from('trips')
          .update({
            current_location_lat: location.latitude,
            current_location_lng: location.longitude,
            current_location_city: location.city,
            current_location_state: location.state,
            current_location_updated_at: new Date().toISOString(),
          })
          .eq('id', tripId);
      }
    } catch (e) {
      console.error('Error refreshing location:', e);
      setError('Failed to refresh location');
    }
  }, [tripId]);

  // Toggle location sharing
  const toggleLocationSharing = useCallback(
    async (enabled: boolean) => {
      setError(null);

      try {
        // Update trip-level setting if we have a tripId
        if (tripId) {
          await supabase
            .from('trips')
            .update({ share_location: enabled })
            .eq('id', tripId);
        } else if (driverId) {
          // Otherwise update driver default
          await supabase
            .from('drivers')
            .update({ location_sharing_enabled: enabled })
            .eq('id', driverId);
        }

        setIsEnabled(enabled);

        // Update context
        const context = await getTrackingContext();
        await setTrackingContext({
          ...context,
          driverId: context.driverId!,
          ownerId: context.ownerId!,
          locationSharingEnabled: enabled,
        });
      } catch (e) {
        console.error('Error toggling location sharing:', e);
        setError('Failed to update settings');
      }
    },
    [tripId, driverId]
  );

  // Manual start tracking
  const startTracking = useCallback(async (): Promise<boolean> => {
    const success = await startLocationTracking();
    setIsTracking(success);
    return success;
  }, []);

  // Manual stop tracking
  const stopTracking = useCallback(async (): Promise<void> => {
    await stopLocationTracking();
    setIsTracking(false);
  }, []);

  return {
    isTracking,
    isEnabled,
    lastLocation,
    isLoading,
    error,
    refreshLocation,
    toggleLocationSharing,
    startTracking,
    stopTracking,
  };
}

/**
 * Helper hook to clean up tracking on logout
 */
export function useLocationTrackingCleanup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      // User logged out - clear tracking context
      clearTrackingContext();
    }
  }, [user]);
}
