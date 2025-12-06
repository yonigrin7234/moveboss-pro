/**
 * Offline Cache Utility
 *
 * Persists data to AsyncStorage for offline access.
 * Shows cached data instantly while fetching fresh data in background.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@moveboss_cache_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  userId: string;
  timestamp: number;
}

/**
 * Save data to persistent cache
 */
export async function saveToCache<T>(
  key: string,
  data: T,
  userId: string
): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      userId,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify(entry)
    );
  } catch {
    // Silently fail - caching is best effort
  }
}

/**
 * Load data from persistent cache
 * Returns null if cache is expired, missing, or for wrong user
 */
export async function loadFromCache<T>(
  key: string,
  userId: string
): Promise<T | null> {
  try {
    const stored = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!stored) return null;

    const entry: CacheEntry<T> = JSON.parse(stored);

    // Check if cache is for current user
    if (entry.userId !== userId) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) return null;

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Clear a specific cache entry
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch {
    // Silently fail
  }
}

/**
 * Clear all cache entries for a user
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Silently fail
  }
}

// Cache keys
export const CACHE_KEYS = {
  TRIPS_LIST: 'trips_list',
  TRIP_DETAIL: (id: string) => `trip_${id}`,
  DASHBOARD: 'dashboard',
  DRIVER_PROFILE: 'driver_profile',
} as const;
