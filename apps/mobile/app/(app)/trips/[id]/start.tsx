/**
 * Trip Start Screen Route
 *
 * Full-screen focused experience for starting a trip.
 * - Large odometer input
 * - Camera for odometer photo
 * - Success celebration
 * - Navigates to first load on success
 */

import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { TripStartScreen } from '../../../../components/ui/TripStartScreen';
import { useTripActions } from '../../../../hooks/useTripActions';
import { useImageUpload } from '../../../../hooks/useImageUpload';
import { useAuth } from '../../../../providers/AuthProvider';
import { supabase } from '../../../../lib/supabase';
import { TripWithLoads, TripLoad } from '../../../../types';
import { colors, typography, spacing } from '../../../../lib/theme';

// Helper to add timeout to promises
// Uses PromiseLike<T> to support Supabase query builders which are Promise-like but not Promise types
function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  // Convert to proper Promise first, then race with timeout
  const promiseResolved = Promise.resolve(promise);
  return Promise.race([
    promiseResolved,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

// Module-level cache to persist across component mounts
const tripStartCache: Map<string, { data: TripWithLoads; fetchedForUser: string }> = new Map();
const tripStartFetching: Set<string> = new Set();

// Module-level cache for form state - survives component re-mounts during async operations
const formStateCache: Map<string, { odometer: string; photoUri: string | null }> = new Map();

export default function TripStartRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  // Check cache for initial state
  const cacheKey = id || '';
  const cachedData = tripStartCache.get(cacheKey);
  const hasCachedData = cachedData && cachedData.fetchedForUser === user?.id;

  // Local state for trip data - initialized from cache if available
  const [trip, setTrip] = useState<TripWithLoads | null>(() =>
    hasCachedData ? cachedData.data : null
  );
  const [loading, setLoading] = useState(() => !hasCachedData);
  const [error, setError] = useState<string | null>(null);

  const { uploadOdometerPhoto } = useImageUpload();
  // Use ref to avoid re-renders during processing
  const isProcessingRef = useRef(false);

  // Lifted form state - initialized from module-level cache to survive even parent re-mounts
  const cachedFormState = formStateCache.get(id || '');
  const [formOdometer, setFormOdometerState] = useState(() => cachedFormState?.odometer || '');
  const [formPhotoUri, setFormPhotoUriState] = useState<string | null>(() => cachedFormState?.photoUri || null);

  // Wrapped setters that also update module-level cache
  const setFormOdometer = useCallback((value: string) => {
    setFormOdometerState(value);
    if (id) {
      const current = formStateCache.get(id) || { odometer: '', photoUri: null };
      formStateCache.set(id, { ...current, odometer: value });
    }
  }, [id]);

  const setFormPhotoUri = useCallback((value: string | null) => {
    setFormPhotoUriState(value);
    if (id) {
      const current = formStateCache.get(id) || { odometer: '', photoUri: null };
      formStateCache.set(id, { ...current, photoUri: value });
    }
  }, [id]);

  // Stable no-op callback for useTripActions
  const noopCallback = useMemo(() => () => Promise.resolve(), []);

  // Simple one-time fetch on mount with module-level cache
  useEffect(() => {
    if (!user?.id || !id) {
      setLoading(false);
      if (!user?.id) {
        setError('Not authenticated');
      } else if (!id) {
        setError('Trip ID missing');
      }
      return;
    }

    // Check cache first
    const cached = tripStartCache.get(id);
    if (cached && cached.fetchedForUser === user.id) {
      setTrip(cached.data);
      setLoading(false);
      return;
    }

    // Check if already fetching
    if (tripStartFetching.has(id)) {
      return;
    }

    tripStartFetching.add(id);
    setLoading(true);

    const fetchTrip = async () => {
      try {
        setError(null);

        // Get driver record with timeout
        const driverResult = await withTimeout(
          supabase
            .from('drivers')
            .select('id, owner_id')
            .eq('auth_user_id', user.id)
            .single(),
          10000,
          'Connection timeout - please check your network'
        );

        const { data: driver, error: driverError } = driverResult;

        if (driverError || !driver) {
          setError('Driver profile not found');
          return;
        }

        // Fetch trip with loads with timeout
        const tripResult = await withTimeout(
          supabase
            .from('trips')
            .select(`
              *,
              trucks:truck_id (id, unit_number),
              trip_loads (
                id, trip_id, load_id, sequence_index, role,
                loads (id)
              )
            `)
            .eq('id', id)
            .single(),
          15000,
          'Connection timeout - please check your network'
        );

        const { data: tripData, error: tripError } = tripResult;

        if (tripError) {
          throw tripError;
        }

        if (!tripData) {
          setError('Trip not found');
          return;
        }

        if (tripData.driver_id !== driver.id) {
          setError('Access denied');
          return;
        }
        // Cache the result
        tripStartCache.set(id, { data: tripData, fetchedForUser: user.id });
        setTrip(tripData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trip');
      } finally {
        setLoading(false);
        tripStartFetching.delete(id);
      }
    };

    fetchTrip();
  }, [user?.id, id]);

  // Create trip actions with stable callback
  const tripActions = useTripActions(id || '', noopCallback);

  // Find the first actionable load
  const findFirstLoad = useCallback((): TripLoad | null => {
    if (!trip?.trip_loads?.length) return null;
    const sorted = [...trip.trip_loads].sort((a, b) => a.sequence_index - b.sequence_index);
    return sorted[0] || null;
  }, [trip]);

  const handleStart = useCallback(
    async (data: { odometer: number; photoUri: string }) => {
      if (!id || isProcessingRef.current) {
        return { success: false, error: 'Invalid state' };
      }

      isProcessingRef.current = true;

      try {
        // Upload odometer photo
        const uploadResult = await uploadOdometerPhoto(data.photoUri, id, 'start');

        if (!uploadResult.success) {
          return { success: false, error: uploadResult.error || 'Failed to upload photo' };
        }

        // Start trip with odometer data
        const result = await tripActions.startTrip({
          odometerStart: data.odometer,
          odometerStartPhotoUrl: uploadResult.url!,
        });

        return result;
      } catch (err) {
        return { success: false, error: 'Failed to start trip' };
      } finally {
        isProcessingRef.current = false;
      }
    },
    [id, tripActions, uploadOdometerPhoto]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const handleSuccess = useCallback(() => {
    // Clear form cache since trip started successfully
    if (id) {
      formStateCache.delete(id);
      tripStartCache.delete(id);
    }

    // Navigate to first load or back to trip detail
    const firstLoad = findFirstLoad();

    if (firstLoad) {
      // Navigate to first load
      router.replace(`/(app)/trips/${id}/loads/${firstLoad.loads.id}`);
    } else {
      // No loads, go back to trip detail
      router.replace(`/(app)/trips/${id}`);
    }
  }, [router, id, findFirstLoad]);

  const handleRetry = useCallback(() => {
    if (!id || !user?.id) return;
    // Clear cache to allow refetch
    tripStartCache.delete(id);
    tripStartFetching.delete(id);
    setLoading(true);
    setError(null);
    setTrip(null);
    // The useEffect will re-run since we cleared the cache
  }, [user?.id, id]);

  // Loading state
  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading trip...</Text>
        </View>
      </>
    );
  }

  // Error state
  if (error || !trip) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Trip</Text>
          <Text style={styles.errorMessage}>{error || 'Trip not found'}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
              <Text style={styles.backText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <TripStartScreen
        tripNumber={String(trip.trip_number || '')}
        truckUnit={trip.trucks?.unit_number?.toString()}
        onStart={handleStart}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
        odometer={formOdometer}
        onOdometerChange={setFormOdometer}
        photoUri={formPhotoUri}
        onPhotoUriChange={setFormPhotoUri}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    ...typography.headline,
    fontSize: 24,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
  },
  retryText: {
    ...typography.button,
    color: colors.white,
  },
  backButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
