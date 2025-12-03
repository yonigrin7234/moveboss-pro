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
import { Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { TripStartScreen } from '../../../../components/ui/TripStartScreen';
import { useDriverTripDetail } from '../../../../hooks/useDriverTrips';
import { useTripActions } from '../../../../hooks/useTripActions';
import { useImageUpload } from '../../../../hooks/useImageUpload';
import { TripLoad } from '../../../../types';

export default function TripStartRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { trip, refetch } = useDriverTripDetail(id);
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

  if (!trip) {
    return null;
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
