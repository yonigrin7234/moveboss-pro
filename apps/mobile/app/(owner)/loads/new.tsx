/**
 * New Load Screen - Create a new load from mobile
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useOwner } from '../../../providers/OwnerProvider';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows, presets } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';

type LoadSource = 'partner' | 'own_customer';
type ServiceType = 'hhg_local' | 'hhg_long_distance' | 'commercial' | 'storage_in' | 'storage_out' | 'freight' | 'other';

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'hhg_local', label: 'HHG Local' },
  { value: 'hhg_long_distance', label: 'HHG Long Distance' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'storage_in', label: 'Storage In' },
  { value: 'storage_out', label: 'Storage Out' },
  { value: 'freight', label: 'Freight' },
  { value: 'other', label: 'Other' },
];

interface FormData {
  loadSource: LoadSource;
  serviceType: ServiceType;
  // Origin
  originCity: string;
  originState: string;
  originZip: string;
  // Destination
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  // Pricing
  cubicFeet: string;
  ratePerCuft: string;
  // RFD
  rfdDate: string;
  rfdIsTbd: boolean;
  // Customer (for own_customer)
  customerName: string;
  customerPhone: string;
  balanceDue: string;
  // Notes
  notes: string;
}

export default function NewLoadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { company } = useOwner();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormData>({
    loadSource: 'partner',
    serviceType: 'hhg_long_distance',
    originCity: '',
    originState: '',
    originZip: '',
    destinationCity: '',
    destinationState: '',
    destinationZip: '',
    cubicFeet: '',
    ratePerCuft: '',
    rfdDate: '',
    rfdIsTbd: false,
    customerName: '',
    customerPhone: '',
    balanceDue: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showServiceTypePicker, setShowServiceTypePicker] = useState(false);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
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

    // Common validations
    if (!form.destinationCity.trim()) {
      newErrors.destinationCity = 'Destination city is required';
    }
    if (!form.destinationState.trim()) {
      newErrors.destinationState = 'State is required';
    }
    if (!form.rfdDate && !form.rfdIsTbd) {
      newErrors.rfdDate = 'RFD date is required or mark as TBD';
    }

    // Partner load validations
    if (form.loadSource === 'partner') {
      if (!form.cubicFeet) {
        newErrors.cubicFeet = 'Cubic feet is required';
      }
      if (!form.ratePerCuft) {
        newErrors.ratePerCuft = 'Rate is required';
      }
    }

    // Own customer validations
    if (form.loadSource === 'own_customer') {
      if (!form.customerName.trim()) {
        newErrors.customerName = 'Customer name is required';
      }
      if (!form.customerPhone.trim()) {
        newErrors.customerPhone = 'Customer phone is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createLoadMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company');

      const cubicFeet = form.cubicFeet ? parseFloat(form.cubicFeet) : null;
      const ratePerCuft = form.ratePerCuft ? parseFloat(form.ratePerCuft) : null;
      const linehaulAmount = cubicFeet && ratePerCuft ? cubicFeet * ratePerCuft : null;

      const payload = {
        company_id: company.id,
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        load_type: 'company_load',
        load_source: form.loadSource,
        load_flow_type: form.loadSource === 'own_customer' ? 'hhg_originated' : 'carrier_intake',
        service_type: form.serviceType,
        status: 'pending',
        // Origin (for live loads, use pickup fields)
        pickup_city: form.originCity || null,
        pickup_state: form.originState || null,
        pickup_postal_code: form.originZip || null,
        // Destination
        dropoff_city: form.destinationCity,
        dropoff_state: form.destinationState,
        dropoff_postal_code: form.destinationZip || null,
        delivery_city: form.destinationCity,
        delivery_state: form.destinationState,
        delivery_postal_code: form.destinationZip || null,
        // Pricing
        cubic_feet: cubicFeet,
        rate_per_cuft: ratePerCuft,
        linehaul_amount: linehaulAmount,
        total_rate: linehaulAmount,
        // RFD
        rfd_date: form.rfdIsTbd ? null : form.rfdDate || null,
        rfd_date_tbd: form.rfdIsTbd,
        // Customer details
        customer_name: form.loadSource === 'own_customer' ? form.customerName : null,
        customer_phone: form.loadSource === 'own_customer' ? form.customerPhone : null,
        balance_due: form.loadSource === 'own_customer' && form.balanceDue
          ? parseFloat(form.balanceDue)
          : null,
        // Notes
        notes: form.notes || null,
      };

      const { data, error } = await supabase
        .from('loads')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats'] });
      Alert.alert('Success', 'Load created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      haptics.error();
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create load');
    },
  });

  const handleSubmit = () => {
    haptics.selection();
    if (!validate()) {
      haptics.error();
      return;
    }
    createLoadMutation.mutate();
  };

  const linehaulAmount = form.cubicFeet && form.ratePerCuft
    ? (parseFloat(form.cubicFeet) * parseFloat(form.ratePerCuft)).toFixed(2)
    : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-left" size="md" color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Load</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Load Source Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Load Type</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[
                styles.toggleButton,
                form.loadSource === 'partner' && styles.toggleButtonActive,
              ]}
              onPress={() => updateField('loadSource', 'partner')}
            >
              <Icon
                name="truck"
                size="sm"
                color={form.loadSource === 'partner' ? colors.white : colors.textSecondary}
              />
              <Text style={[
                styles.toggleText,
                form.loadSource === 'partner' && styles.toggleTextActive,
              ]}>
                Partner Load
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleButton,
                form.loadSource === 'own_customer' && styles.toggleButtonActive,
              ]}
              onPress={() => updateField('loadSource', 'own_customer')}
            >
              <Icon
                name="user"
                size="sm"
                color={form.loadSource === 'own_customer' ? colors.white : colors.textSecondary}
              />
              <Text style={[
                styles.toggleText,
                form.loadSource === 'own_customer' && styles.toggleTextActive,
              ]}>
                My Customer
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Service Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Type</Text>
          <Pressable
            style={styles.pickerButton}
            onPress={() => setShowServiceTypePicker(!showServiceTypePicker)}
          >
            <Text style={styles.pickerButtonText}>
              {SERVICE_TYPES.find((t) => t.value === form.serviceType)?.label || 'Select'}
            </Text>
            <Icon name="chevron-down" size="sm" color={colors.textMuted} />
          </Pressable>
          {showServiceTypePicker && (
            <View style={styles.pickerDropdown}>
              {SERVICE_TYPES.map((type) => (
                <Pressable
                  key={type.value}
                  style={[
                    styles.pickerOption,
                    form.serviceType === type.value && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    updateField('serviceType', type.value);
                    setShowServiceTypePicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    form.serviceType === type.value && styles.pickerOptionTextActive,
                  ]}>
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Customer Details (for own_customer only) */}
        {form.loadSource === 'own_customer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Customer Name *</Text>
              <TextInput
                style={[styles.input, errors.customerName && styles.inputError]}
                value={form.customerName}
                onChangeText={(text) => updateField('customerName', text)}
                placeholder="John Smith"
                placeholderTextColor={colors.textMuted}
              />
              {errors.customerName && (
                <Text style={styles.errorText}>{errors.customerName}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Customer Phone *</Text>
              <TextInput
                style={[styles.input, errors.customerPhone && styles.inputError]}
                value={form.customerPhone}
                onChangeText={(text) => updateField('customerPhone', text)}
                placeholder="555-123-4567"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              {errors.customerPhone && (
                <Text style={styles.errorText}>{errors.customerPhone}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Balance Due on Delivery</Text>
              <TextInput
                style={styles.input}
                value={form.balanceDue}
                onChangeText={(text) => updateField('balanceDue', text)}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        )}

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
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ZIP Code</Text>
            <TextInput
              style={styles.input}
              value={form.originZip}
              onChangeText={(text) => updateField('originZip', text)}
              placeholder="90210"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>

        {/* Destination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destination *</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={[styles.input, errors.destinationCity && styles.inputError]}
                value={form.destinationCity}
                onChangeText={(text) => updateField('destinationCity', text)}
                placeholder="City"
                placeholderTextColor={colors.textMuted}
              />
              {errors.destinationCity && (
                <Text style={styles.errorText}>{errors.destinationCity}</Text>
              )}
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>State *</Text>
              <TextInput
                style={[styles.input, errors.destinationState && styles.inputError]}
                value={form.destinationState}
                onChangeText={(text) => updateField('destinationState', text.toUpperCase())}
                placeholder="IL"
                placeholderTextColor={colors.textMuted}
                maxLength={2}
                autoCapitalize="characters"
              />
              {errors.destinationState && (
                <Text style={styles.errorText}>{errors.destinationState}</Text>
              )}
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ZIP Code</Text>
            <TextInput
              style={styles.input}
              value={form.destinationZip}
              onChangeText={(text) => updateField('destinationZip', text)}
              placeholder="60601"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>
                Cubic Feet {form.loadSource === 'partner' ? '*' : ''}
              </Text>
              <TextInput
                style={[styles.input, errors.cubicFeet && styles.inputError]}
                value={form.cubicFeet}
                onChangeText={(text) => updateField('cubicFeet', text)}
                placeholder="1200"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
              {errors.cubicFeet && (
                <Text style={styles.errorText}>{errors.cubicFeet}</Text>
              )}
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>
                Rate/CF {form.loadSource === 'partner' ? '*' : ''}
              </Text>
              <TextInput
                style={[styles.input, errors.ratePerCuft && styles.inputError]}
                value={form.ratePerCuft}
                onChangeText={(text) => updateField('ratePerCuft', text)}
                placeholder="3.50"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
              {errors.ratePerCuft && (
                <Text style={styles.errorText}>{errors.ratePerCuft}</Text>
              )}
            </View>
          </View>
          {linehaulAmount && (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Linehaul Amount</Text>
              <Text style={styles.totalValue}>${linehaulAmount}</Text>
            </View>
          )}
        </View>

        {/* RFD Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ready For Delivery (RFD) *</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>RFD Date</Text>
            <TextInput
              style={[
                styles.input,
                errors.rfdDate && styles.inputError,
                form.rfdIsTbd && styles.inputDisabled,
              ]}
              value={form.rfdDate}
              onChangeText={(text) => updateField('rfdDate', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              editable={!form.rfdIsTbd}
            />
            {errors.rfdDate && (
              <Text style={styles.errorText}>{errors.rfdDate}</Text>
            )}
          </View>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => updateField('rfdIsTbd', !form.rfdIsTbd)}
          >
            <View style={[styles.checkbox, form.rfdIsTbd && styles.checkboxChecked]}>
              {form.rfdIsTbd && <Icon name="check" size="sm" color={colors.white} />}
            </View>
            <Text style={styles.checkboxLabel}>TBD (To Be Determined)</Text>
          </Pressable>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.notes}
            onChangeText={(text) => updateField('notes', text)}
            placeholder="Additional notes for the driver..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, createLoadMutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createLoadMutation.isPending}
        >
          {createLoadMutation.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Icon name="plus" size="sm" color={colors.white} />
              <Text style={styles.submitButtonText}>Create Load</Text>
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
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.white,
    fontWeight: '600',
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
  pickerButtonText: {
    ...typography.body,
    color: colors.textPrimary,
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
  pickerOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  pickerOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
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
  inputDisabled: {
    opacity: 0.5,
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
  totalCard: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  totalValue: {
    ...typography.numericLarge,
    color: colors.success,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    ...typography.body,
    color: colors.textPrimary,
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
