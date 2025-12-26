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
import { calculateDeliveryDeadline, formatDateForDB } from '../../../lib/business-days';

type LoadSource = 'partner' | 'own_customer';
type LoadType = 'company_load' | 'live_load';
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

// ZIP auto-lookup using free Zippopotam.us API
async function lookupZip(zip: string): Promise<{ city: string; state: string }> {
  if (!zip || zip.length < 5) return { city: '', state: '' };
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!response.ok) return { city: '', state: '' };
    const data = await response.json();
    const place = data.places?.[0];
    if (place) {
      return {
        city: place['place name'] || '',
        state: place['state abbreviation'] || '',
      };
    }
    return { city: '', state: '' };
  } catch {
    return { city: '', state: '' };
  }
}

interface FormData {
  loadSource: LoadSource;
  loadType: LoadType;
  serviceType: ServiceType;
  internalReference: string;
  // Origin / Pickup
  originCity: string;
  originState: string;
  originZip: string;
  originAddress1: string;
  originAddress2: string;
  // Pickup Contact (for live_load)
  pickupContactName: string;
  pickupContactPhone: string;
  // Destination
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  destinationAddress1: string;
  destinationAddress2: string;
  // Warehouse/Loading Contact (for company_load)
  loadingContactName: string;
  loadingContactPhone: string;
  loadingContactEmail: string;
  loadingAddress1: string;
  loadingAddress2: string;
  loadingCity: string;
  loadingState: string;
  loadingPostalCode: string;
  // Pricing
  cubicFeet: string;
  ratePerCuft: string;
  // RFD
  rfdDate: string;
  rfdIsTbd: boolean;
  rfdDaysToDeliver: string;
  rfdUseBusinessDays: boolean;
  // Customer (for own_customer)
  customerName: string;
  customerPhone: string;
  balanceDue: string;
  // Customer delivery address (for own_customer)
  deliveryAddress1: string;
  deliveryAddress2: string;
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
    loadType: 'company_load',
    serviceType: 'hhg_long_distance',
    internalReference: '',
    // Origin / Pickup
    originCity: '',
    originState: '',
    originZip: '',
    originAddress1: '',
    originAddress2: '',
    // Pickup Contact (for live_load)
    pickupContactName: '',
    pickupContactPhone: '',
    // Destination
    destinationCity: '',
    destinationState: '',
    destinationZip: '',
    destinationAddress1: '',
    destinationAddress2: '',
    // Warehouse/Loading Contact (for company_load)
    loadingContactName: '',
    loadingContactPhone: '',
    loadingContactEmail: '',
    loadingAddress1: '',
    loadingAddress2: '',
    loadingCity: '',
    loadingState: '',
    loadingPostalCode: '',
    // Pricing
    cubicFeet: '',
    ratePerCuft: '',
    // RFD
    rfdDate: '',
    rfdIsTbd: false,
    rfdDaysToDeliver: '',
    rfdUseBusinessDays: true,
    // Customer (for own_customer)
    customerName: '',
    customerPhone: '',
    balanceDue: '',
    // Customer delivery address (for own_customer)
    deliveryAddress1: '',
    deliveryAddress2: '',
    // Notes
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
    if (!form.rfdDate && !form.rfdIsTbd) {
      newErrors.rfdDate = 'RFD date is required or mark as TBD';
    }

    // Partner load validations
    if (form.loadSource === 'partner') {
      // Destination required for partner loads
      if (!form.destinationCity.trim()) {
        newErrors.destinationCity = 'Destination city is required';
      }
      if (!form.destinationState.trim()) {
        newErrors.destinationState = 'State is required';
      }
      if (!form.destinationZip.trim()) {
        newErrors.destinationZip = 'ZIP is required';
      }
      // Pricing required for partner loads
      if (!form.cubicFeet) {
        newErrors.cubicFeet = 'Cubic feet is required';
      }
      if (!form.ratePerCuft) {
        newErrors.ratePerCuft = 'Rate is required';
      }

      // Load type specific validations
      if (form.loadType === 'live_load') {
        // Live load requires pickup info
        if (!form.originZip.trim()) {
          newErrors.originZip = 'Pickup ZIP is required';
        }
        if (!form.originCity.trim()) {
          newErrors.originCity = 'Pickup city is required';
        }
        if (!form.originState.trim()) {
          newErrors.originState = 'Pickup state is required';
        }
        if (!form.originAddress1.trim()) {
          newErrors.originAddress1 = 'Pickup address is required';
        }
        if (!form.pickupContactName.trim()) {
          newErrors.pickupContactName = 'Contact name is required';
        }
        if (!form.pickupContactPhone.trim()) {
          newErrors.pickupContactPhone = 'Contact phone is required';
        }
      } else if (form.loadType === 'company_load') {
        // Company load requires warehouse contact info
        if (!form.loadingContactName.trim()) {
          newErrors.loadingContactName = 'Contact name is required';
        }
        if (!form.loadingContactPhone.trim()) {
          newErrors.loadingContactPhone = 'Contact phone is required';
        }
        if (!form.loadingAddress1.trim()) {
          newErrors.loadingAddress1 = 'Address is required';
        }
        if (!form.loadingCity.trim()) {
          newErrors.loadingCity = 'City is required';
        }
        if (!form.loadingState.trim()) {
          newErrors.loadingState = 'State is required';
        }
        if (!form.loadingPostalCode.trim()) {
          newErrors.loadingPostalCode = 'ZIP is required';
        }
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
      // Delivery address required for own customer
      if (!form.destinationZip.trim()) {
        newErrors.destinationZip = 'Delivery ZIP is required';
      }
      if (!form.destinationCity.trim()) {
        newErrors.destinationCity = 'Delivery city is required';
      }
      if (!form.destinationState.trim()) {
        newErrors.destinationState = 'Delivery state is required';
      }
      if (!form.deliveryAddress1.trim()) {
        newErrors.deliveryAddress1 = 'Delivery address is required';
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

      // Build payload matching web structure exactly
      const payload: Record<string, unknown> = {
        company_id: company.id,
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        load_type: form.loadSource === 'partner' ? form.loadType : 'company_load',
        load_source: form.loadSource,
        load_flow_type: form.loadSource === 'own_customer' ? 'hhg_originated' : 'carrier_intake',
        service_type: form.serviceType,
        status: 'pending',
        internal_reference: form.internalReference || null,
        // Pricing
        cubic_feet: cubicFeet,
        rate_per_cuft: ratePerCuft,
        linehaul_amount: linehaulAmount,
        total_rate: linehaulAmount,
        // RFD
        rfd_date: form.rfdIsTbd ? null : form.rfdDate || null,
        rfd_date_tbd: form.rfdIsTbd,
        rfd_days_to_deliver: form.rfdDaysToDeliver ? parseInt(form.rfdDaysToDeliver, 10) : null,
        rfd_use_business_days: form.rfdUseBusinessDays,
        rfd_delivery_deadline: (() => {
          // Calculate deadline if we have rfd_date and days_to_deliver, and not TBD
          if (form.rfdDate && form.rfdDaysToDeliver && !form.rfdIsTbd) {
            const rfdDate = new Date(form.rfdDate);
            const daysToDeliver = parseInt(form.rfdDaysToDeliver, 10);
            if (!isNaN(rfdDate.getTime()) && !isNaN(daysToDeliver) && daysToDeliver > 0) {
              const deadline = calculateDeliveryDeadline(rfdDate, daysToDeliver, form.rfdUseBusinessDays);
              return formatDateForDB(deadline);
            }
          }
          return null;
        })(),
        // Notes
        notes: form.notes || null,
      };

      // Partner load fields
      if (form.loadSource === 'partner') {
        // Destination
        payload.dropoff_postal_code = form.destinationZip || null;
        payload.dropoff_city = form.destinationCity || null;
        payload.dropoff_state = form.destinationState || null;
        payload.dropoff_address_line1 = form.destinationAddress1 || null;
        payload.dropoff_address_line2 = form.destinationAddress2 || null;

        if (form.loadType === 'live_load') {
          // Live load - pickup info
          payload.pickup_postal_code = form.originZip || null;
          payload.pickup_city = form.originCity || null;
          payload.pickup_state = form.originState || null;
          payload.pickup_address_line1 = form.originAddress1 || null;
          payload.pickup_address_line2 = form.originAddress2 || null;
          payload.pickup_contact_name = form.pickupContactName || null;
          payload.pickup_contact_phone = form.pickupContactPhone || null;
        } else {
          // Company load - warehouse contact snapshot
          payload.loading_contact_name = form.loadingContactName || null;
          payload.loading_contact_phone = form.loadingContactPhone || null;
          payload.loading_contact_email = form.loadingContactEmail || null;
          payload.loading_address_line1 = form.loadingAddress1 || null;
          payload.loading_address_line2 = form.loadingAddress2 || null;
          payload.loading_city = form.loadingCity || null;
          payload.loading_state = form.loadingState || null;
          payload.loading_postal_code = form.loadingPostalCode || null;
        }
      }

      // Own customer fields
      if (form.loadSource === 'own_customer') {
        payload.customer_name = form.customerName || null;
        payload.customer_phone = form.customerPhone || null;
        payload.balance_due = form.balanceDue ? parseFloat(form.balanceDue) : null;
        // Delivery address
        payload.delivery_postal_code = form.destinationZip || null;
        payload.delivery_city = form.destinationCity || null;
        payload.delivery_state = form.destinationState || null;
        payload.delivery_address_line1 = form.deliveryAddress1 || null;
        payload.delivery_address_line2 = form.deliveryAddress2 || null;
        // Also set dropoff for routing purposes
        payload.dropoff_postal_code = form.destinationZip || null;
        payload.dropoff_city = form.destinationCity || null;
        payload.dropoff_state = form.destinationState || null;
      }

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

        {/* Load Type Toggle - only for partner loads */}
        {form.loadSource === 'partner' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Load Type</Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleButton,
                  form.loadType === 'company_load' && styles.toggleButtonActive,
                ]}
                onPress={() => updateField('loadType', 'company_load')}
              >
                <Icon
                  name="home"
                  size="sm"
                  color={form.loadType === 'company_load' ? colors.white : colors.textSecondary}
                />
                <Text style={[
                  styles.toggleText,
                  form.loadType === 'company_load' && styles.toggleTextActive,
                ]}>
                  From Warehouse
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleButton,
                  form.loadType === 'live_load' && styles.toggleButtonActive,
                ]}
                onPress={() => updateField('loadType', 'live_load')}
              >
                <Icon
                  name="map-pin"
                  size="sm"
                  color={form.loadType === 'live_load' ? colors.white : colors.textSecondary}
                />
                <Text style={[
                  styles.toggleText,
                  form.loadType === 'live_load' && styles.toggleTextActive,
                ]}>
                  Live Load
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Service Type & Internal Reference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service Type *</Text>
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
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Internal Reference</Text>
            <TextInput
              style={styles.input}
              value={form.internalReference}
              onChangeText={(text) => updateField('internalReference', text)}
              placeholder="Your CRM # (optional)"
              placeholderTextColor={colors.textMuted}
            />
          </View>
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

        {/* Delivery Address (for own_customer) */}
        {form.loadSource === 'own_customer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address *</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ZIP Code *</Text>
              <TextInput
                style={[styles.input, errors.destinationZip && styles.inputError]}
                value={form.destinationZip}
                onChangeText={(text) => updateField('destinationZip', text)}
                onBlur={async () => {
                  if (form.destinationZip.length === 5) {
                    const { city, state } = await lookupZip(form.destinationZip);
                    if (city) updateField('destinationCity', city);
                    if (state) updateField('destinationState', state);
                  }
                }}
                placeholder="60601"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={5}
              />
              {errors.destinationZip && (
                <Text style={styles.errorText}>{errors.destinationZip}</Text>
              )}
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={[styles.input, errors.destinationCity && styles.inputError]}
                  value={form.destinationCity}
                  onChangeText={(text) => updateField('destinationCity', text)}
                  placeholder="Chicago"
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
              <Text style={styles.inputLabel}>Address Line 1 *</Text>
              <TextInput
                style={[styles.input, errors.deliveryAddress1 && styles.inputError]}
                value={form.deliveryAddress1}
                onChangeText={(text) => updateField('deliveryAddress1', text)}
                placeholder="123 Main Street"
                placeholderTextColor={colors.textMuted}
              />
              {errors.deliveryAddress1 && (
                <Text style={styles.errorText}>{errors.deliveryAddress1}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address Line 2</Text>
              <TextInput
                style={styles.input}
                value={form.deliveryAddress2}
                onChangeText={(text) => updateField('deliveryAddress2', text)}
                placeholder="Apt 4B, Suite 100, etc."
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        )}

        {/* Pickup & On-site Contact (for partner + live_load) */}
        {form.loadSource === 'partner' && form.loadType === 'live_load' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup & On-site Contact *</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pickup ZIP *</Text>
              <TextInput
                style={[styles.input, errors.originZip && styles.inputError]}
                value={form.originZip}
                onChangeText={(text) => updateField('originZip', text)}
                onBlur={async () => {
                  if (form.originZip.length === 5) {
                    const { city, state } = await lookupZip(form.originZip);
                    if (city) updateField('originCity', city);
                    if (state) updateField('originState', state);
                  }
                }}
                placeholder="90210"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={5}
              />
              {errors.originZip && (
                <Text style={styles.errorText}>{errors.originZip}</Text>
              )}
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={[styles.input, errors.originCity && styles.inputError]}
                  value={form.originCity}
                  onChangeText={(text) => updateField('originCity', text)}
                  placeholder="Los Angeles"
                  placeholderTextColor={colors.textMuted}
                />
                {errors.originCity && (
                  <Text style={styles.errorText}>{errors.originCity}</Text>
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={[styles.input, errors.originState && styles.inputError]}
                  value={form.originState}
                  onChangeText={(text) => updateField('originState', text.toUpperCase())}
                  placeholder="CA"
                  placeholderTextColor={colors.textMuted}
                  maxLength={2}
                  autoCapitalize="characters"
                />
                {errors.originState && (
                  <Text style={styles.errorText}>{errors.originState}</Text>
                )}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address Line 1 *</Text>
              <TextInput
                style={[styles.input, errors.originAddress1 && styles.inputError]}
                value={form.originAddress1}
                onChangeText={(text) => updateField('originAddress1', text)}
                placeholder="123 Pickup Street"
                placeholderTextColor={colors.textMuted}
              />
              {errors.originAddress1 && (
                <Text style={styles.errorText}>{errors.originAddress1}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address Line 2</Text>
              <TextInput
                style={styles.input}
                value={form.originAddress2}
                onChangeText={(text) => updateField('originAddress2', text)}
                placeholder="Suite, Building, etc."
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Contact Name *</Text>
                <TextInput
                  style={[styles.input, errors.pickupContactName && styles.inputError]}
                  value={form.pickupContactName}
                  onChangeText={(text) => updateField('pickupContactName', text)}
                  placeholder="John Doe"
                  placeholderTextColor={colors.textMuted}
                />
                {errors.pickupContactName && (
                  <Text style={styles.errorText}>{errors.pickupContactName}</Text>
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Contact Phone *</Text>
                <TextInput
                  style={[styles.input, errors.pickupContactPhone && styles.inputError]}
                  value={form.pickupContactPhone}
                  onChangeText={(text) => updateField('pickupContactPhone', text)}
                  placeholder="555-123-4567"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
                {errors.pickupContactPhone && (
                  <Text style={styles.errorText}>{errors.pickupContactPhone}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Warehouse Contact Snapshot (for partner + company_load) */}
        {form.loadSource === 'partner' && form.loadType === 'company_load' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Warehouse Contact *</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Contact Name *</Text>
                <TextInput
                  style={[styles.input, errors.loadingContactName && styles.inputError]}
                  value={form.loadingContactName}
                  onChangeText={(text) => updateField('loadingContactName', text)}
                  placeholder="Dispatch Contact"
                  placeholderTextColor={colors.textMuted}
                />
                {errors.loadingContactName && (
                  <Text style={styles.errorText}>{errors.loadingContactName}</Text>
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Contact Phone *</Text>
                <TextInput
                  style={[styles.input, errors.loadingContactPhone && styles.inputError]}
                  value={form.loadingContactPhone}
                  onChangeText={(text) => updateField('loadingContactPhone', text)}
                  placeholder="555-123-4567"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
                {errors.loadingContactPhone && (
                  <Text style={styles.errorText}>{errors.loadingContactPhone}</Text>
                )}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={form.loadingContactEmail}
                onChangeText={(text) => updateField('loadingContactEmail', text)}
                placeholder="dispatch@company.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ZIP Code *</Text>
              <TextInput
                style={[styles.input, errors.loadingPostalCode && styles.inputError]}
                value={form.loadingPostalCode}
                onChangeText={(text) => updateField('loadingPostalCode', text)}
                onBlur={async () => {
                  if (form.loadingPostalCode.length === 5) {
                    const { city, state } = await lookupZip(form.loadingPostalCode);
                    if (city) updateField('loadingCity', city);
                    if (state) updateField('loadingState', state);
                  }
                }}
                placeholder="60601"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={5}
              />
              {errors.loadingPostalCode && (
                <Text style={styles.errorText}>{errors.loadingPostalCode}</Text>
              )}
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={[styles.input, errors.loadingCity && styles.inputError]}
                  value={form.loadingCity}
                  onChangeText={(text) => updateField('loadingCity', text)}
                  placeholder="Chicago"
                  placeholderTextColor={colors.textMuted}
                />
                {errors.loadingCity && (
                  <Text style={styles.errorText}>{errors.loadingCity}</Text>
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={[styles.input, errors.loadingState && styles.inputError]}
                  value={form.loadingState}
                  onChangeText={(text) => updateField('loadingState', text.toUpperCase())}
                  placeholder="IL"
                  placeholderTextColor={colors.textMuted}
                  maxLength={2}
                  autoCapitalize="characters"
                />
                {errors.loadingState && (
                  <Text style={styles.errorText}>{errors.loadingState}</Text>
                )}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address Line 1 *</Text>
              <TextInput
                style={[styles.input, errors.loadingAddress1 && styles.inputError]}
                value={form.loadingAddress1}
                onChangeText={(text) => updateField('loadingAddress1', text)}
                placeholder="1234 Warehouse Blvd"
                placeholderTextColor={colors.textMuted}
              />
              {errors.loadingAddress1 && (
                <Text style={styles.errorText}>{errors.loadingAddress1}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address Line 2</Text>
              <TextInput
                style={styles.input}
                value={form.loadingAddress2}
                onChangeText={(text) => updateField('loadingAddress2', text)}
                placeholder="Suite, Dock #, etc."
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        )}

        {/* Destination (for partner loads only - own_customer has delivery in customer section) */}
        {form.loadSource === 'partner' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Destination *</Text>
            <Text style={styles.sectionHint}>
              Enter destination for routing. Driver gets full address from loading report.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Destination ZIP *</Text>
              <TextInput
                style={[styles.input, errors.destinationZip && styles.inputError]}
                value={form.destinationZip}
                onChangeText={(text) => updateField('destinationZip', text)}
                onBlur={async () => {
                  if (form.destinationZip.length === 5) {
                    const { city, state } = await lookupZip(form.destinationZip);
                    if (city) updateField('destinationCity', city);
                    if (state) updateField('destinationState', state);
                  }
                }}
                placeholder="60601"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={5}
              />
              {errors.destinationZip && (
                <Text style={styles.errorText}>{errors.destinationZip}</Text>
              )}
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={[styles.input, errors.destinationCity && styles.inputError]}
                  value={form.destinationCity}
                  onChangeText={(text) => updateField('destinationCity', text)}
                  placeholder="Chicago"
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
          </View>
        )}

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

          {/* Days to Deliver - only show when not TBD */}
          {!form.rfdIsTbd && (
            <>
              <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
                <Text style={styles.inputLabel}>Days to Deliver</Text>
                <TextInput
                  style={styles.input}
                  value={form.rfdDaysToDeliver}
                  onChangeText={(text) => updateField('rfdDaysToDeliver', text.replace(/[^0-9]/g, ''))}
                  placeholder="e.g., 5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.inputHint}>
                  Number of days from RFD date to deliver
                </Text>
              </View>

              {/* Business Days Toggle */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => updateField('rfdUseBusinessDays', !form.rfdUseBusinessDays)}
              >
                <View style={[styles.checkbox, form.rfdUseBusinessDays && styles.checkboxChecked]}>
                  {form.rfdUseBusinessDays && <Icon name="check" size="sm" color={colors.white} />}
                </View>
                <Text style={styles.checkboxLabel}>Use business days (skip weekends & holidays)</Text>
              </Pressable>

              {/* Calculated Deadline Preview */}
              {form.rfdDate && form.rfdDaysToDeliver && (
                <View style={styles.deadlinePreview}>
                  <Text style={styles.deadlineLabel}>Delivery Deadline</Text>
                  <Text style={styles.deadlineValue}>
                    {(() => {
                      const rfdDate = new Date(form.rfdDate);
                      const days = parseInt(form.rfdDaysToDeliver, 10);
                      if (isNaN(rfdDate.getTime()) || isNaN(days) || days <= 0) return '—';
                      const deadline = calculateDeliveryDeadline(rfdDate, days, form.rfdUseBusinessDays);
                      return deadline.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    })()}
                  </Text>
                </View>
              )}
            </>
          )}
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
  sectionHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
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
  inputHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  deadlinePreview: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  deadlineLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  deadlineValue: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
  },
});
