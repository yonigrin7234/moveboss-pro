/**
 * New Trip Screen - Create a new trip from mobile
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useOwner } from '../../../providers/OwnerProvider';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows, presets } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
}

interface Truck {
  id: string;
  unit_number: string;
  vehicle_type: string | null;
}

interface Trailer {
  id: string;
  unit_number: string;
}

interface FormData {
  tripNumber: string;
  referenceNumber: string;
  driverId: string;
  truckId: string;
  trailerId: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export default function NewTripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { company } = useOwner();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormData>({
    tripNumber: '',
    referenceNumber: '',
    driverId: '',
    truckId: '',
    trailerId: '',
    originCity: '',
    originState: '',
    destinationCity: '',
    destinationState: '',
    startDate: '',
    endDate: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [showTruckPicker, setShowTruckPicker] = useState(false);
  const [showTrailerPicker, setShowTrailerPicker] = useState(false);

  // Fetch drivers
  const { data: drivers } = useQuery({
    queryKey: ['drivers', company?.id],
    queryFn: async (): Promise<Driver[]> => {
      if (!company?.id) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('drivers')
        .select('id, first_name, last_name')
        .eq('owner_id', user.user.id)
        .eq('status', 'active')
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Error fetching drivers:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Fetch trucks
  const { data: trucks } = useQuery({
    queryKey: ['trucks', company?.id],
    queryFn: async (): Promise<Truck[]> => {
      if (!company?.id) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('trucks')
        .select('id, unit_number, vehicle_type')
        .eq('owner_id', user.user.id)
        .order('unit_number', { ascending: true });

      if (error) {
        console.error('Error fetching trucks:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Fetch trailers
  const { data: trailers } = useQuery({
    queryKey: ['trailers', company?.id],
    queryFn: async (): Promise<Trailer[]> => {
      if (!company?.id) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('trailers')
        .select('id, unit_number')
        .eq('owner_id', user.user.id)
        .order('unit_number', { ascending: true });

      if (error) {
        console.error('Error fetching trailers:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!company?.id,
  });

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Check truck/trailer compatibility
    if (form.truckId) {
      const selectedTruck = trucks?.find((t) => t.id === form.truckId);
      if (selectedTruck?.vehicle_type === 'tractor' && !form.trailerId) {
        newErrors.trailerId = 'Tractors require a trailer';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createTripMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Check if selected truck is a non-tractor (box truck) - if so, clear trailer
      let finalTrailerId: string | null = form.trailerId || null;
      if (form.truckId) {
        const selectedTruck = trucks?.find((t) => t.id === form.truckId);
        if (selectedTruck?.vehicle_type && selectedTruck.vehicle_type !== 'tractor') {
          finalTrailerId = null;
        }
      }

      const payload = {
        owner_id: user.user.id,
        trip_number: form.tripNumber.trim() || undefined, // Will be auto-generated if not provided
        reference_number: form.referenceNumber.trim() || null,
        status: 'planned',
        driver_id: form.driverId || null,
        truck_id: form.truckId || null,
        trailer_id: finalTrailerId,
        origin_city: form.originCity.trim() || null,
        origin_state: form.originState.trim() || null,
        destination_city: form.destinationCity.trim() || null,
        destination_state: form.destinationState.trim() || null,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        notes: form.notes.trim() || null,
      };

      // If no trip number provided, generate one
      if (!payload.trip_number) {
        const { data: lastTrip } = await supabase
          .from('trips')
          .select('trip_number')
          .eq('owner_id', user.user.id)
          .like('trip_number', 'TRP-%')
          .order('trip_number', { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (lastTrip && lastTrip.length > 0) {
          const match = lastTrip[0].trip_number.match(/TRP-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
          }
        }
        payload.trip_number = `TRP-${nextNumber.toString().padStart(4, '0')}`;
      }

      const { data, error } = await supabase
        .from('trips')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-active-trips'] });
      Alert.alert('Success', `Trip ${data.trip_number} created`, [
        { text: 'Add Loads', onPress: () => router.replace(`/(owner)/trips/${data.id}`) },
        { text: 'Done', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      haptics.error();
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create trip');
    },
  });

  const handleSubmit = () => {
    haptics.selection();
    if (!validate()) {
      haptics.error();
      return;
    }
    createTripMutation.mutate();
  };

  const selectedDriver = drivers?.find((d) => d.id === form.driverId);
  const selectedTruck = trucks?.find((t) => t.id === form.truckId);
  const selectedTrailer = trailers?.find((t) => t.id === form.trailerId);

  // Check if trailer selection should be shown (only for tractors or when no truck selected)
  const showTrailerOption = !form.truckId || selectedTruck?.vehicle_type === 'tractor';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-left" size="md" color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Create Trip</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Trip Number */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Trip Number (auto-generated if empty)</Text>
            <TextInput
              style={styles.input}
              value={form.tripNumber}
              onChangeText={(text) => updateField('tripNumber', text)}
              placeholder="TRP-0001"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reference Number</Text>
            <TextInput
              style={styles.input}
              value={form.referenceNumber}
              onChangeText={(text) => updateField('referenceNumber', text)}
              placeholder="Your reference..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Driver Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver</Text>
          <Pressable
            style={styles.pickerButton}
            onPress={() => setShowDriverPicker(!showDriverPicker)}
          >
            <View style={styles.pickerButtonContent}>
              <Icon name="user" size="sm" color={selectedDriver ? colors.primary : colors.textMuted} />
              <Text style={[
                styles.pickerButtonText,
                !selectedDriver && styles.pickerButtonPlaceholder,
              ]}>
                {selectedDriver
                  ? `${selectedDriver.first_name} ${selectedDriver.last_name}`
                  : 'Select driver (optional)'}
              </Text>
            </View>
            <Icon name="chevron-down" size="sm" color={colors.textMuted} />
          </Pressable>
          {showDriverPicker && (
            <View style={styles.pickerDropdown}>
              <Pressable
                style={styles.pickerOption}
                onPress={() => {
                  updateField('driverId', '');
                  setShowDriverPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>No driver</Text>
              </Pressable>
              {drivers?.map((driver) => (
                <Pressable
                  key={driver.id}
                  style={[
                    styles.pickerOption,
                    form.driverId === driver.id && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    updateField('driverId', driver.id);
                    setShowDriverPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    form.driverId === driver.id && styles.pickerOptionTextActive,
                  ]}>
                    {driver.first_name} {driver.last_name}
                  </Text>
                </Pressable>
              ))}
              {(!drivers || drivers.length === 0) && (
                <View style={styles.pickerEmptyState}>
                  <Text style={styles.pickerEmptyText}>No drivers found</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Equipment Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment</Text>

          {/* Truck */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Truck</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowTruckPicker(!showTruckPicker)}
            >
              <View style={styles.pickerButtonContent}>
                <Icon name="truck" size="sm" color={selectedTruck ? colors.primary : colors.textMuted} />
                <Text style={[
                  styles.pickerButtonText,
                  !selectedTruck && styles.pickerButtonPlaceholder,
                ]}>
                  {selectedTruck ? selectedTruck.unit_number : 'Select truck (optional)'}
                </Text>
              </View>
              <Icon name="chevron-down" size="sm" color={colors.textMuted} />
            </Pressable>
            {showTruckPicker && (
              <View style={styles.pickerDropdown}>
                <Pressable
                  style={styles.pickerOption}
                  onPress={() => {
                    updateField('truckId', '');
                    updateField('trailerId', ''); // Clear trailer if truck is cleared
                    setShowTruckPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>No truck</Text>
                </Pressable>
                {trucks?.map((truck) => (
                  <Pressable
                    key={truck.id}
                    style={[
                      styles.pickerOption,
                      form.truckId === truck.id && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      updateField('truckId', truck.id);
                      // Clear trailer if switching to non-tractor
                      if (truck.vehicle_type && truck.vehicle_type !== 'tractor') {
                        updateField('trailerId', '');
                      }
                      setShowTruckPicker(false);
                    }}
                  >
                    <View style={styles.pickerOptionRow}>
                      <Text style={[
                        styles.pickerOptionText,
                        form.truckId === truck.id && styles.pickerOptionTextActive,
                      ]}>
                        {truck.unit_number}
                      </Text>
                      {truck.vehicle_type && (
                        <Text style={styles.vehicleTypeBadge}>
                          {truck.vehicle_type === 'tractor' ? 'Tractor' : 'Box Truck'}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
                {(!trucks || trucks.length === 0) && (
                  <View style={styles.pickerEmptyState}>
                    <Text style={styles.pickerEmptyText}>No trucks found</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Trailer (only show for tractors) */}
          {showTrailerOption && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Trailer {selectedTruck?.vehicle_type === 'tractor' ? '*' : ''}
              </Text>
              <Pressable
                style={[styles.pickerButton, errors.trailerId && styles.pickerButtonError]}
                onPress={() => setShowTrailerPicker(!showTrailerPicker)}
              >
                <View style={styles.pickerButtonContent}>
                  <Icon name="box" size="sm" color={selectedTrailer ? colors.primary : colors.textMuted} />
                  <Text style={[
                    styles.pickerButtonText,
                    !selectedTrailer && styles.pickerButtonPlaceholder,
                  ]}>
                    {selectedTrailer ? selectedTrailer.unit_number : 'Select trailer'}
                  </Text>
                </View>
                <Icon name="chevron-down" size="sm" color={colors.textMuted} />
              </Pressable>
              {errors.trailerId && (
                <Text style={styles.errorText}>{errors.trailerId}</Text>
              )}
              {showTrailerPicker && (
                <View style={styles.pickerDropdown}>
                  <Pressable
                    style={styles.pickerOption}
                    onPress={() => {
                      updateField('trailerId', '');
                      setShowTrailerPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>No trailer</Text>
                  </Pressable>
                  {trailers?.map((trailer) => (
                    <Pressable
                      key={trailer.id}
                      style={[
                        styles.pickerOption,
                        form.trailerId === trailer.id && styles.pickerOptionActive,
                      ]}
                      onPress={() => {
                        updateField('trailerId', trailer.id);
                        setShowTrailerPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        form.trailerId === trailer.id && styles.pickerOptionTextActive,
                      ]}>
                        {trailer.unit_number}
                      </Text>
                    </Pressable>
                  ))}
                  {(!trailers || trailers.length === 0) && (
                    <View style={styles.pickerEmptyState}>
                      <Text style={styles.pickerEmptyText}>No trailers found</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Origin */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Origin</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={form.originCity}
                onChangeText={(text) => updateField('originCity', text)}
                placeholder="City"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={styles.input}
                value={form.originState}
                onChangeText={(text) => updateField('originState', text.toUpperCase())}
                placeholder="CA"
                placeholderTextColor={colors.textMuted}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {/* Destination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destination</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={form.destinationCity}
                onChangeText={(text) => updateField('destinationCity', text)}
                placeholder="City"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={styles.input}
                value={form.destinationState}
                onChangeText={(text) => updateField('destinationState', text.toUpperCase())}
                placeholder="IL"
                placeholderTextColor={colors.textMuted}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TextInput
                style={styles.input}
                value={form.startDate}
                onChangeText={(text) => updateField('startDate', text)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>End Date</Text>
              <TextInput
                style={styles.input}
                value={form.endDate}
                onChangeText={(text) => updateField('endDate', text)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.notes}
            onChangeText={(text) => updateField('notes', text)}
            placeholder="Trip notes..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, createTripMutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createTripMutation.isPending}
        >
          {createTripMutation.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Icon name="plus" size="sm" color={colors.white} />
              <Text style={styles.submitButtonText}>Create Trip</Text>
            </>
          )}
        </Pressable>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.screenPadding,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    ...presets.input,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerButtonError: {
    borderColor: colors.error,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerButtonText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  pickerButtonPlaceholder: {
    color: colors.textMuted,
  },
  pickerDropdown: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  pickerOption: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionActive: {
    backgroundColor: colors.primarySoft,
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  pickerOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  pickerEmptyState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  pickerEmptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  vehicleTypeBadge: {
    ...typography.caption,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radius.md,
    ...shadows.glow,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
