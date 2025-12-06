# Mobile App Data Layer Architecture

This document describes the data fetching, caching, and real-time update architecture for the MoveBoss driver mobile app.

## Overview

The data layer implements a **stale-while-revalidate** pattern with:
- **Module-level caching** for instant access across component mounts
- **Persistent AsyncStorage caching** for offline access and instant app loads
- **Supabase Realtime subscriptions** for live updates from dispatchers
- **Per-user data scoping** to prevent data leakage between accounts

## Key Files

| File | Purpose |
|------|---------|
| `lib/offlineCache.ts` | AsyncStorage-based persistent cache utilities |
| `lib/logger.ts` | Centralized logging with categories |
| `hooks/useDriverDashboard.ts` | Dashboard data with trips, actions, stats |
| `hooks/useDriverTrips.ts` | Trip list and trip detail hooks |
| `hooks/useRealtimeSubscription.ts` | Supabase real-time subscription hooks |

## Caching Strategy

### Three-Level Cache

1. **React State** - Component-local, lost on unmount
2. **Module Cache** - Persists across component mounts during session
3. **AsyncStorage** - Persists across app restarts (24-hour expiry)

### Per-User Scoping

All cache entries are user-scoped:
- AsyncStorage entries include `userId` in the stored data
- `loadFromCache` validates the userId matches before returning data
- Module-level "already loaded" flags track which user they loaded for

```typescript
// Module-level cache tracks which user's data is stored
const dashboardCache: {
  data: TripWithLoads[] | null;
  fetchedForUser: string | null;  // <-- User scoping
} = { data: null, fetchedForUser: null };

// Persistent cache load tracking is per-user
let lastPersistentCacheLoadedForUser: string | null = null;
```

## Data Fetching Pattern

### Initial Load Flow

1. **Mount** - Check module cache, show if matches current user
2. **Persistent Cache** - Load from AsyncStorage if not already loaded for this user
3. **Network Fetch** - Always fetch fresh data in background
4. **Update** - On success, update module cache, state, and persistent cache

### Error Handling

Errors are handled gracefully without wiping cached data:

```typescript
} catch (err) {
  // Only show error UI if we don't have cached data to show
  if (!hasCachedData) {
    setError(errorMessage);
    setTrips([]);
  }
  // If we have cached data, silently fail - user still sees old data
}
```

### Refetch Behavior

The `refetch` function triggers a fresh fetch **without clearing cached data**:

```typescript
const refetch = useCallback(async () => {
  if (!user?.id) return;

  // Reset fetch flag to allow new fetch, but DON'T clear cached data
  isFetchingRef.current = false;
  setIsRefreshing(true);  // Shows subtle refresh indicator
  setError(null);
  fetchDashboardData();   // Fetch will update cache on success
}, [user?.id, fetchDashboardData]);
```

## Loading States

Two distinct loading states:

| State | UI | When Used |
|-------|-----|-----------|
| `loading` | Full skeleton | No cached data, waiting for first load |
| `isRefreshing` | Subtle indicator | Have cached data, fetching in background |

```typescript
if (!hasCachedData) {
  setLoading(true);      // Show skeleton
} else {
  setIsRefreshing(true); // Show refresh indicator (pull-to-refresh)
}
```

## Real-Time Subscriptions

### Driver Dashboard Subscription

Subscribes to:
- `trips` table changes for this driver
- `loads` table updates for this owner
- `trip_loads` table changes (load assignments)

### Trip Detail Subscription

Subscribes to:
- Specific `trips` row changes
- `trip_loads` for this trip
- `loads` updates for this owner
- `trip_expenses` for this trip

### Debounced Refetch

Real-time events trigger a debounced "silent refetch":

```typescript
const silentRefetch = useCallback(() => {
  if (!user?.id || isFetchingRef.current) return;
  // Background fetch - shows isRefreshing, not loading
  fetchDashboardData();
}, [user?.id, fetchDashboardData]);
```

## Logging

Uses categorized loggers for debugging:

```typescript
import { dataLogger, cacheLogger, realtimeLogger } from '../lib/logger';

// Examples
cacheLogger.debug('Cache hit: dashboard');
dataLogger.info('Fetched 5 trips for dashboard');
realtimeLogger.info('Subscribing to driver-updates-abc123');
```

Logging is only enabled in development (`__DEV__`).

## Best Practices

1. **Never clear cache before fetch** - Only update on success
2. **Always scope data to user** - Check userId before returning cached data
3. **Use isRefreshing for background updates** - Reserve loading for first load
4. **Preserve cached data on errors** - Better to show stale data than nothing
5. **Log significant events** - Helps debug cache and subscription issues
