/**
 * Complete Delivery Screen Route
 *
 * Full-screen celebration experience for completing a delivery.
 * - Prominent confirmation button
 * - Success celebration with confetti
 * - Navigates to next load or trip summary
 */

import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { DeliveryCompleteScreen } from '../../../../../../components/ui/DeliveryCompleteScreen';
import { useLoadDetail } from '../../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../../hooks/useLoadActions';
import { useDriverTripDetail } from '../../../../../../hooks/useDriverTrips';
import { colors, typography, spacing } from '../../../../../../lib/theme';

export default function CompleteDeliveryRoute() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const router = useRouter();
  const { load, loading, error, refetch } = useLoadDetail(loadId);
  const { trip } = useDriverTripDetail(tripId);
  const actions = useLoadActions(loadId, refetch);
  const [isProcessing, setIsProcessing] = useState(false);

  // Find the next load after this one
  const nextLoadInfo = useMemo(() => {
    if (!trip?.trip_loads?.length) return null;

    // Sort loads by sequence
    const sorted = [...trip.trip_loads].sort((a, b) => a.sequence_index - b.sequence_index);

    // Find current load index
    const currentIndex = sorted.findIndex((tl) => tl.loads.id === loadId);
    if (currentIndex === -1 || currentIndex >= sorted.length - 1) return null;

    // Get next load
    const nextLoad = sorted[currentIndex + 1];
    if (!nextLoad) return null;

    // Check if next load needs delivery (is not already delivered)
    if (nextLoad.loads.load_status === 'delivered' || nextLoad.loads.load_status === 'storage_completed') {
      return null;
    }

    return {
      id: nextLoad.loads.id,
      number: nextLoad.loads.load_number || `${nextLoad.sequence_index + 1}`,
    };
  }, [trip, loadId]);

  const getDeliveryAddress = useCallback(() => {
    if (!load) return '';
    const parts = [
      load.dropoff_address_line1 || load.delivery_address_line1,
      load.dropoff_city || load.delivery_city,
      load.dropoff_state || load.delivery_state,
    ].filter(Boolean);
    return parts.join(', ') || 'Delivery address';
  }, [load]);

  const handleComplete = useCallback(async () => {
    if (isProcessing) {
      return { success: false, error: 'Already processing' };
    }

    setIsProcessing(true);

    try {
      const result = await actions.completeDelivery();
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to complete delivery' };
    } finally {
      setIsProcessing(false);
    }
  }, [actions, isProcessing]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const handleSuccess = useCallback(() => {
    if (nextLoadInfo) {
      // Navigate to next load
      router.replace(`/(app)/trips/${tripId}/loads/${nextLoadInfo.id}`);
    } else {
      // Navigate back to trip detail (all loads completed)
      router.replace(`/(app)/trips/${tripId}`);
    }
  }, [router, tripId, nextLoadInfo]);

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
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </>
    );
  }

  // Error state
  if (error || !load) {
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
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorMessage}>{error || 'Load not found'}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
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

  const loadNumber = load.job_number || load.load_number || 'Unknown';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <DeliveryCompleteScreen
        loadNumber={loadNumber}
        deliveryAddress={getDeliveryAddress()}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
        hasNextLoad={!!nextLoadInfo}
        nextLoadNumber={nextLoadInfo?.number}
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
