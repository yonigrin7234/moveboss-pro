/**
 * Location Tracking Service
 * Handles background GPS tracking for driver location updates
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const LOCATION_TASK_NAME = 'MOVEBOSS_BACKGROUND_LOCATION';
const LOCATION_CACHE_KEY = 'MOVEBOSS_PENDING_LOCATIONS';

// Storage keys for tracking state
const STORAGE_KEYS = {
  DRIVER_ID: 'current_driver_id',
  TRIP_ID: 'active_trip_id',
  OWNER_ID: 'owner_id',
  LOCATION_SHARING_ENABLED: 'location_sharing_enabled',
} as const;

interface CachedLocation {
  driver_id: string;
  trip_id: string | null;
  owner_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  speed_mph: number | null;
  heading: number | null;
  altitude_meters: number | null;
  device_timestamp: string;
  recorded_at: string;
}

/**
 * Define the background task for location updates
 * This runs even when the app is in the background
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    for (const location of locations) {
      await processLocationUpdate(location);
    }
  }
});

/**
 * Process a location update - either send to server or cache if offline
 */
async function processLocationUpdate(location: Location.LocationObject) {
  try {
    const driverId = await AsyncStorage.getItem(STORAGE_KEYS.DRIVER_ID);
    const tripId = await AsyncStorage.getItem(STORAGE_KEYS.TRIP_ID);
    const ownerId = await AsyncStorage.getItem(STORAGE_KEYS.OWNER_ID);
    const locationSharingEnabled = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_SHARING_ENABLED);

    if (!driverId || !ownerId || locationSharingEnabled !== 'true') {
      return; // Don't track if not enabled or no driver
    }

    const locationData: CachedLocation = {
      driver_id: driverId,
      trip_id: tripId,
      owner_id: ownerId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy_meters: location.coords.accuracy,
      speed_mph: location.coords.speed ? location.coords.speed * 2.237 : null, // m/s to mph
      heading: location.coords.heading,
      altitude_meters: location.coords.altitude,
      device_timestamp: new Date(location.timestamp).toISOString(),
      recorded_at: new Date().toISOString(),
    };

    // Try to send to server
    const { error: insertError } = await supabase
      .from('driver_locations')
      .insert({
        ...locationData,
        source: 'mobile_background',
      });

    if (insertError) {
      // Cache for later if offline
      await cacheLocationForLater(locationData);
    } else {
      // Also update the trip's current location if we have a trip
      if (tripId) {
        await updateTripLocation(tripId, location);
      }
    }
  } catch (e) {
    console.error('Error processing location:', e);
  }
}

/**
 * Update the trip record with current location
 */
async function updateTripLocation(tripId: string, location: Location.LocationObject) {
  try {
    // Reverse geocode to get city/state
    const [address] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    await supabase
      .from('trips')
      .update({
        current_location_lat: location.coords.latitude,
        current_location_lng: location.coords.longitude,
        current_location_city: address?.city || null,
        current_location_state: address?.region || null,
        current_location_updated_at: new Date().toISOString(),
      })
      .eq('id', tripId);
  } catch {
    // Silently fail - trip location update is nice-to-have
  }
}

/**
 * Cache location for offline sync
 */
async function cacheLocationForLater(locationData: CachedLocation) {
  try {
    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    const locations: CachedLocation[] = cached ? JSON.parse(cached) : [];
    locations.push(locationData);

    // Keep only last 100 locations to prevent storage bloat
    const trimmed = locations.slice(-100);
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Error caching location:', e);
  }
}

/**
 * Sync cached locations when back online
 */
export async function syncCachedLocations(): Promise<number> {
  try {
    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return 0;

    const locations: CachedLocation[] = JSON.parse(cached);
    if (locations.length === 0) return 0;

    const { error } = await supabase
      .from('driver_locations')
      .insert(locations.map(loc => ({ ...loc, source: 'mobile_cached' })));

    if (!error) {
      // Clear cache on success
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
      return locations.length;
    }

    return 0;
  } catch (e) {
    console.error('Error syncing cached locations:', e);
    return 0;
  }
}

/**
 * Start background location tracking
 */
export async function startLocationTracking(): Promise<boolean> {
  try {
    // Request foreground permissions first
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return false;
    }

    // Request background permissions
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      // We can still do foreground tracking
    }

    // Check if already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isRunning) {
      return true;
    }

    // Start tracking
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5 * 60 * 1000, // Every 5 minutes
      distanceInterval: 500, // Or every 500 meters
      deferredUpdatesInterval: 5 * 60 * 1000,
      deferredUpdatesDistance: 500,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'MoveBoss Location Active',
        notificationBody: 'Tracking location for load matching',
        notificationColor: '#6366F1',
      },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Stop background location tracking
 */
export async function stopLocationTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Check if location tracking is currently running
 */
export async function isLocationTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
}

/**
 * Get current location once (for immediate use)
 */
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return location;
  } catch {
    return null;
  }
}

/**
 * Get current location with reverse geocoding
 */
export async function getCurrentLocationWithAddress(): Promise<{
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
} | null> {
  const location = await getCurrentLocation();
  if (!location) return null;

  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city: address?.city || null,
      state: address?.region || null,
    };
  } catch {
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city: null,
      state: null,
    };
  }
}

/**
 * Store tracking context (called when driver logs in or starts a trip)
 */
export async function setTrackingContext(params: {
  driverId: string;
  ownerId: string;
  tripId?: string | null;
  locationSharingEnabled?: boolean;
}): Promise<void> {
  const { driverId, ownerId, tripId, locationSharingEnabled } = params;

  await AsyncStorage.setItem(STORAGE_KEYS.DRIVER_ID, driverId);
  await AsyncStorage.setItem(STORAGE_KEYS.OWNER_ID, ownerId);

  if (tripId) {
    await AsyncStorage.setItem(STORAGE_KEYS.TRIP_ID, tripId);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.TRIP_ID);
  }

  if (typeof locationSharingEnabled === 'boolean') {
    await AsyncStorage.setItem(
      STORAGE_KEYS.LOCATION_SHARING_ENABLED,
      locationSharingEnabled.toString()
    );
  }
}

/**
 * Clear tracking context (called on logout)
 */
export async function clearTrackingContext(): Promise<void> {
  await stopLocationTracking();
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.DRIVER_ID,
    STORAGE_KEYS.OWNER_ID,
    STORAGE_KEYS.TRIP_ID,
    STORAGE_KEYS.LOCATION_SHARING_ENABLED,
  ]);
}

/**
 * Get current tracking context
 */
export async function getTrackingContext(): Promise<{
  driverId: string | null;
  ownerId: string | null;
  tripId: string | null;
  locationSharingEnabled: boolean;
}> {
  const [driverId, ownerId, tripId, sharingEnabled] = await AsyncStorage.multiGet([
    STORAGE_KEYS.DRIVER_ID,
    STORAGE_KEYS.OWNER_ID,
    STORAGE_KEYS.TRIP_ID,
    STORAGE_KEYS.LOCATION_SHARING_ENABLED,
  ]);

  return {
    driverId: driverId[1],
    ownerId: ownerId[1],
    tripId: tripId[1],
    locationSharingEnabled: sharingEnabled[1] === 'true',
  };
}
