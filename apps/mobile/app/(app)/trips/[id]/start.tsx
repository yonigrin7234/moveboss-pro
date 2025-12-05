/**
 * Trip Start Screen Route
 *
 * Full-screen focused experience for starting a trip.
 * - Large odometer input
 * - Camera for odometer photo
 * - Success celebration
 * - Navigates to first load on success
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { TripStartScreen } from '../../../../components/ui/TripStartScreen';
import { useDriverTripDetail } from '../../../../hooks/useDriverTrips';
import { useTripActions } from '../../../../hooks/useTripActions';
import { useImageUpload } from '../../../../hooks/useImageUpload';
import { TripLoad } from '../../../../types';
import { colors, typography, spacing } from '../../../../lib/theme';

export default function TripStartRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { trip, loading, error, refetch } = useDriverTripDetail(id);
  const tripActions = useTripActions(id || '', refetch);
  const { uploadOdometerPhoto } = useImageUpload();
  const [isProcessing, setIsProcessing] = useState(false);

  // Find the first actionable load
  const findFirstLoad = useCallback((): TripLoad | null => {
    if (!trip?.trip_loads?.length) return null;
    const sorted = [...trip.trip_loads].sort((a, b) => a.sequence_index - b.sequence_index);
    return sorted[0] || null;
  }, [trip]);

  const handleStart = useCallback(
    async (data: { odometer: number; photoUri: string }) => {
      if (!id || isProcessing) {
        return { success: false, error: 'Invalid state' };
      }

      setIsProcessing(true);

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
      } catch (error) {
        return { success: false, error: 'Failed to start trip' };
      } finally {
        setIsProcessing(false);
      }
    },
    [id, tripActions, uploadOdometerPhoto, isProcessing]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const handleSuccess = useCallback(() => {
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
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
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
