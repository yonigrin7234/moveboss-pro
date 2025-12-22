/**
 * AssignToTripSheet - Bottom sheet for assigning loads to trips
 */

import React, { forwardRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { BottomSheet, BottomSheetRef } from '../ui/BottomSheet';
import { Icon } from '../ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { haptics } from '../../lib/haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface Trip {
  id: string;
  trip_number: string;
  status: string;
  start_date: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  driver: {
    first_name: string;
    last_name: string;
  } | null;
}

interface AssignToTripSheetProps {
  loadId: string | null;
  loadNumber?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const AssignToTripSheet = forwardRef<BottomSheetRef, AssignToTripSheetProps>(
  ({ loadId, loadNumber, onClose, onSuccess }, ref) => {
    const queryClient = useQueryClient();
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

    // Fetch available trips (planned, active, en_route)
    const { data: trips, isLoading: tripsLoading } = useQuery({
      queryKey: ['available-trips'],
      queryFn: async (): Promise<Trip[]> => {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return [];

        const { data, error } = await supabase
          .from('trips')
          .select(`
            id,
            trip_number,
            status,
            start_date,
            origin_city,
            origin_state,
            destination_city,
            destination_state,
            driver:drivers(
              first_name,
              last_name
            )
          `)
          .eq('owner_id', user.user.id)
          .in('status', ['planned', 'active', 'en_route'])
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching trips:', error);
          return [];
        }

        return (data || []).map(trip => ({
          ...trip,
          driver: Array.isArray(trip.driver) ? trip.driver[0] : trip.driver,
        }));
      },
      enabled: !!loadId,
    });

    // Check if load is already assigned to a trip
    const { data: currentAssignment } = useQuery({
      queryKey: ['load-trip-assignment', loadId],
      queryFn: async () => {
        if (!loadId) return null;

        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return null;

        const { data, error } = await supabase
          .from('trip_loads')
          .select(`
            id,
            trip_id,
            trip:trips(
              trip_number
            )
          `)
          .eq('load_id', loadId)
          .eq('owner_id', user.user.id)
          .maybeSingle();

        if (error || !data) return null;

        // Extract trip number from the joined trip data
        const tripData = data.trip as { trip_number: string } | { trip_number: string }[] | null;
        let tripNumber: string | undefined;
        if (Array.isArray(tripData)) {
          tripNumber = tripData[0]?.trip_number;
        } else if (tripData) {
          tripNumber = tripData.trip_number;
        }

        return {
          tripLoadId: data.id,
          tripId: data.trip_id,
          tripNumber,
        };
      },
      enabled: !!loadId,
    });

    const assignMutation = useMutation({
      mutationFn: async (tripId: string) => {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Not authenticated');
        if (!loadId) throw new Error('No load selected');

        // Check if load is already on this trip
        if (currentAssignment?.tripId === tripId) {
          throw new Error('Load is already assigned to this trip');
        }

        // Check if load has been assigned to an external carrier
        const { data: loadData } = await supabase
          .from('loads')
          .select('assigned_carrier_id')
          .eq('id', loadId)
          .single();

        if (loadData?.assigned_carrier_id) {
          throw new Error('This load has been assigned to an external carrier and cannot be added to your trip.');
        }

        // If load is on another trip, remove it first
        if (currentAssignment) {
          await supabase
            .from('trip_loads')
            .delete()
            .eq('id', currentAssignment.tripLoadId);
        }

        // Get sequence index (count of loads on trip)
        const { count } = await supabase
          .from('trip_loads')
          .select('id', { count: 'exact', head: true })
          .eq('trip_id', tripId)
          .eq('owner_id', user.user.id);

        const sequenceIndex = count || 0;

        // Add load to trip
        const { data, error } = await supabase
          .from('trip_loads')
          .insert({
            owner_id: user.user.id,
            trip_id: tripId,
            load_id: loadId,
            sequence_index: sequenceIndex,
            role: 'primary',
          })
          .select()
          .single();

        if (error) throw error;

        // Update load's delivery order
        await supabase
          .from('loads')
          .update({
            delivery_order: sequenceIndex + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', loadId);

        return data;
      },
      onSuccess: () => {
        haptics.success();
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['loads'] });
        queryClient.invalidateQueries({ queryKey: ['load-trip-assignment'] });
        queryClient.invalidateQueries({ queryKey: ['available-trips'] });
        Alert.alert('Success', 'Load assigned to trip');
        onSuccess?.();
        onClose?.();
      },
      onError: (error) => {
        haptics.error();
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to assign load');
      },
    });

    const removeMutation = useMutation({
      mutationFn: async () => {
        if (!currentAssignment) throw new Error('Load is not assigned to a trip');

        await supabase
          .from('trip_loads')
          .delete()
          .eq('id', currentAssignment.tripLoadId);

        // Clear delivery order on load
        if (loadId) {
          await supabase
            .from('loads')
            .update({
              delivery_order: null,
              assigned_driver_id: null,
              assigned_driver_name: null,
              assigned_driver_phone: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', loadId);
        }
      },
      onSuccess: () => {
        haptics.success();
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['loads'] });
        queryClient.invalidateQueries({ queryKey: ['load-trip-assignment'] });
        Alert.alert('Success', 'Load removed from trip');
        onSuccess?.();
        onClose?.();
      },
      onError: (error) => {
        haptics.error();
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove load');
      },
    });

    const handleAssign = () => {
      if (!selectedTripId) {
        haptics.error();
        Alert.alert('Select a Trip', 'Please select a trip to assign this load to');
        return;
      }
      haptics.selection();
      assignMutation.mutate(selectedTripId);
    };

    const handleRemove = () => {
      haptics.selection();
      Alert.alert(
        'Remove from Trip',
        `Remove this load from trip ${currentAssignment?.tripNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeMutation.mutate(),
          },
        ]
      );
    };

    const isLoading = assignMutation.isPending || removeMutation.isPending;

    if (!loadId) return null;

    return (
      <BottomSheet
        ref={ref}
        title="Assign to Trip"
        snapPoints={['75%']}
        onClose={onClose}
      >
        <View style={styles.container}>
          {loadNumber && (
            <Text style={styles.loadNumber}>Load: {loadNumber}</Text>
          )}

          {currentAssignment && (
            <View style={styles.currentAssignment}>
              <Icon name="truck" size="md" color={colors.info} />
              <View style={styles.assignmentContent}>
                <Text style={styles.assignmentTitle}>Currently Assigned</Text>
                <Text style={styles.assignmentText}>
                  {currentAssignment.tripNumber}
                </Text>
              </View>
              <Pressable
                style={styles.removeButton}
                onPress={handleRemove}
                disabled={isLoading}
              >
                {removeMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Icon name="x" size="sm" color={colors.error} />
                )}
              </Pressable>
            </View>
          )}

          <Text style={styles.sectionTitle}>
            {currentAssignment ? 'Move to Different Trip' : 'Select Trip'}
          </Text>

          <ScrollView style={styles.tripList}>
            {tripsLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : trips && trips.length > 0 ? (
              trips.map((trip) => {
                const isSelected = selectedTripId === trip.id;
                const isCurrent = currentAssignment?.tripId === trip.id;
                const route = [
                  trip.origin_city && `${trip.origin_city}, ${trip.origin_state}`,
                  trip.destination_city && `${trip.destination_city}, ${trip.destination_state}`,
                ].filter(Boolean).join(' → ');

                return (
                  <Pressable
                    key={trip.id}
                    style={[
                      styles.tripOption,
                      isSelected && styles.tripOptionSelected,
                      isCurrent && styles.tripOptionCurrent,
                    ]}
                    onPress={() => !isCurrent && setSelectedTripId(trip.id)}
                    disabled={isCurrent}
                  >
                    <View style={styles.tripOptionContent}>
                      <View style={styles.tripHeader}>
                        <Text style={[
                          styles.tripNumber,
                          isSelected && styles.tripNumberSelected,
                          isCurrent && styles.tripNumberCurrent,
                        ]}>
                          {trip.trip_number}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(trip.status) + '20' },
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: getStatusColor(trip.status) },
                          ]}>
                            {formatStatus(trip.status)}
                          </Text>
                        </View>
                      </View>
                      {route && (
                        <Text style={styles.tripRoute}>{route}</Text>
                      )}
                      {trip.driver && (
                        <Text style={styles.tripDriver}>
                          {trip.driver.first_name} {trip.driver.last_name}
                        </Text>
                      )}
                      {isCurrent && (
                        <Text style={styles.currentLabel}>Current Assignment</Text>
                      )}
                    </View>
                    {isSelected && !isCurrent && (
                      <Icon name="check" size="md" color={colors.primary} />
                    )}
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icon name="truck" size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>No available trips</Text>
                <Text style={styles.emptySubtext}>Create a trip first</Text>
              </View>
            )}
          </ScrollView>

          {trips && trips.length > 0 && (
            <Pressable
              style={[
                styles.assignButton,
                (!selectedTripId || isLoading) && styles.assignButtonDisabled,
              ]}
              onPress={handleAssign}
              disabled={!selectedTripId || isLoading}
            >
              {assignMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Icon name="plus" size="sm" color={colors.white} />
                  <Text style={styles.assignButtonText}>
                    {currentAssignment ? 'Move to Selected Trip' : 'Assign to Trip'}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </BottomSheet>
    );
  }
);

AssignToTripSheet.displayName = 'AssignToTripSheet';

function getStatusColor(status: string): string {
  switch (status) {
    case 'planned': return colors.info;
    case 'active': return colors.primary;
    case 'en_route': return colors.warning;
    case 'completed': return colors.success;
    default: return colors.textMuted;
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadNumber: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  currentAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  assignmentContent: {
    flex: 1,
  },
  assignmentTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  assignmentText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.info,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  tripList: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  loadingState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  tripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tripOptionCurrent: {
    borderColor: colors.info,
    backgroundColor: colors.infoSoft,
    opacity: 0.7,
  },
  tripOptionContent: {
    flex: 1,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tripNumber: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tripNumberSelected: {
    color: colors.primary,
  },
  tripNumberCurrent: {
    color: colors.info,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  tripRoute: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  tripDriver: {
    ...typography.caption,
    color: colors.textMuted,
  },
  currentLabel: {
    ...typography.caption,
    color: colors.info,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radius.md,
    ...shadows.glow,
  },
  assignButtonDisabled: {
    opacity: 0.5,
  },
  assignButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default AssignToTripSheet;
