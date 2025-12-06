/**
 * Offline Cache Utility
 *
 * Persists data to AsyncStorage for offline access.
 * Shows cached data instantly while fetching fresh data in background.
 *
 * All cache entries are user-scoped to prevent data leakage between accounts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheLogger } from './logger';

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
    cacheLogger.debug(`Saved cache: ${key}`);
  } catch (error) {
    cacheLogger.warn(`Failed to save cache: ${key}`, error);
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
    if (!stored) {
      cacheLogger.debug(`Cache miss: ${key} (not found)`);
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(stored);

    // Check if cache is for current user
    if (entry.userId !== userId) {
      cacheLogger.debug(`Cache miss: ${key} (different user)`);
      return null;
    }

    // Check if cache is expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      cacheLogger.debug(`Cache miss: ${key} (expired)`);
      return null;
    }

    cacheLogger.debug(`Cache hit: ${key}`);
    return entry.data;
  } catch (error) {
    cacheLogger.warn(`Failed to load cache: ${key}`, error);
    return null;
  }
}

/**
 * Clear a specific cache entry
 *
 * NOTE: This should only be used for explicit cache invalidation (e.g., logout).
 * Normal refetch operations should NOT clear cache - they should only update it on success.
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    cacheLogger.debug(`Cleared cache: ${key}`);
  } catch (error) {
    cacheLogger.warn(`Failed to clear cache: ${key}`, error);
  }
}

/**
 * Clear all cache entries
 *
 * Use this on logout to ensure no data persists between user sessions.
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      cacheLogger.info(`Cleared all cache (${cacheKeys.length} entries)`);
    }
  } catch (error) {
    cacheLogger.warn('Failed to clear all cache', error);
  }
}

// Cache keys
export const CACHE_KEYS = {
  TRIPS_LIST: 'trips_list',
  TRIP_DETAIL: (id: string) => `trip_${id}`,
  DASHBOARD: 'dashboard',
  DRIVER_PROFILE: 'driver_profile',
} as const;
