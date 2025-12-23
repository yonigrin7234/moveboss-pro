/**
 * Load Board Detail Screen - View load details and request to haul
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useOwner } from '../../../providers/OwnerProvider';
import { useRequestLoad, useWithdrawRequest } from '../../../hooks/useLoadBoard';
import { Icon, IconName } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';

interface LoadDetails {
  id: string;
  load_number: string;
  posting_type: 'pickup' | 'load' | null;
  load_subtype: 'live' | 'rfd' | null;
  pickup_city: string | null;
  pickup_state: string | null;
  pickup_zip: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_postal_code: string | null;
  cubic_feet_estimate: number | null;
  weight_lbs_estimate: number | null;
  pieces_count: number | null;
  company_rate: number | null;
  company_rate_type: string | null;
  rate_per_cuft: number | null;
  is_open_to_counter: boolean;
  rfd_date: string | null;
  pickup_date_start: string | null;
  pickup_date_end: string | null;
  equipment_type: string | null;
  notes: string | null;
  posted_to_marketplace_at: string | null;
  posted_by_company_id: string | null;
  company: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    mc_number: string | null;
    dot_number: string | null;
  } | null;
}

export default function LoadBoardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { company } = useOwner();
  const { requestLoad, isRequesting } = useRequestLoad();
  const { withdrawRequest, isWithdrawing } = useWithdrawRequest();
  const [message, setMessage] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Fetch load details
  const { data: load, isLoading, refetch } = useQuery({
    queryKey: ['load-board-detail', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('loads')
        .select(`
          id,
          load_number,
          posting_type,
          load_subtype,
          pickup_city,
          pickup_state,
          pickup_zip,
          delivery_city,
          delivery_state,
          delivery_postal_code,
          cubic_feet_estimate,
          weight_lbs_estimate,
          pieces_count,
          company_rate,
          company_rate_type,
          rate_per_cuft,
          is_open_to_counter,
          rfd_date,
          pickup_date_start,
          pickup_date_end,
          equipment_type,
          notes,
          posted_to_marketplace_at,
          posted_by_company_id
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch company separately
      let companyData = null;
      if (data?.posted_by_company_id) {
        const { data: compData } = await supabase
          .from('companies')
          .select('id, name, city, state, mc_number, dot_number')
          .eq('id', data.posted_by_company_id)
          .single();
        companyData = compData;
      }

      return { ...data, company: companyData } as LoadDetails;
    },
    enabled: !!id,
  });

  // Check if user already requested this load
  const { data: existingRequest } = useQuery({
    queryKey: ['load-request', id, company?.id],
    queryFn: async () => {
      if (!id || !company?.id) return null;

      const { data } = await supabase
        .from('load_requests')
        .select('id, status, message')
        .eq('load_id', id)
        .eq('carrier_id', company.id)
        .single();

      return data;
    },
    enabled: !!id && !!company?.id,
  });

  const handleRequestLoad = async () => {
    if (!id) return;

    try {
      await requestLoad({
        loadId: id,
        message: message.trim() || undefined,
        acceptListedRate: true,
      });
      haptics.success();
      Alert.alert(
        'Request Sent',
        'Your request has been sent to the shipper. They will review and respond.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      haptics.error();
      Alert.alert('Error', error.message || 'Failed to send request');
    }
  };

  const handleWithdrawRequest = async () => {
    if (!existingRequest?.id) return;

    Alert.alert(
      'Withdraw Request',
      'Are you sure you want to withdraw your request for this load?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await withdrawRequest({ requestId: existingRequest.id });
              haptics.success();
              refetch();
            } catch (error: any) {
              haptics.error();
              Alert.alert('Error', error.message || 'Failed to withdraw request');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'TBD';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRate = (rate: number | null) => {
    if (!rate) return 'Rate TBD';
    return `$${rate.toLocaleString()}`;
  };

  const getPostingTypeLabel = () => {
    if (!load) return '';
    if (load.posting_type === 'pickup') return 'PICKUP';
    if (load.load_subtype === 'live') return 'LIVE LOAD';
    if (load.load_subtype === 'rfd') return 'RFD LOAD';
    return 'LOAD';
  };

  const getPostingTypeColor = () => {
    if (!load) return colors.primary;
    if (load.posting_type === 'pickup') return colors.warning;
    if (load.load_subtype === 'live') return colors.success;
    return colors.primary;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!load) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Icon name="alert-circle" size="xl" color={colors.error} />
        <Text style={styles.errorText}>Load not found</Text>
        <Pressable style={styles.backButtonAlt} onPress={() => router.back()}>
          <Text style={styles.backButtonAltText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const hasRequested = !!existingRequest;
  const canWithdraw = existingRequest?.status === 'pending';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-left" size="md" color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.loadNumber}>{load.load_number}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: getPostingTypeColor() + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: getPostingTypeColor() }]}>
            {getPostingTypeLabel()}
          </Text>
        </View>

        {/* Route Card */}
        <View style={styles.card}>
          <View style={styles.routeContainer}>
            <View style={styles.locationBox}>
              <View style={styles.dotOrigin} />
              <View style={styles.locationInfo}>
                <Text style={styles.cityLabel}>Origin</Text>
                <Text style={styles.cityName}>
                  {load.pickup_city}, {load.pickup_state}
                </Text>
                <Text style={styles.zipText}>{load.pickup_zip}</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.locationBox}>
              <View style={styles.dotDestination} />
              <View style={styles.locationInfo}>
                <Text style={styles.cityLabel}>Destination</Text>
                <Text style={styles.cityName}>
                  {load.delivery_city}, {load.delivery_state}
                </Text>
                <Text style={styles.zipText}>{load.delivery_postal_code}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Rate Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rate</Text>
          <Text style={styles.rateAmount}>{formatRate(load.company_rate)}</Text>
          {load.rate_per_cuft && (
            <Text style={styles.ratePerCuft}>
              ${load.rate_per_cuft.toFixed(2)}/CF
            </Text>
          )}
          {load.is_open_to_counter && (
            <View style={styles.counterBadge}>
              <Icon name="message-circle" size="xs" color={colors.primary} />
              <Text style={styles.counterBadgeText}>Open to counter offers</Text>
            </View>
          )}
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Load Details</Text>
          <View style={styles.detailsGrid}>
            <DetailItem
              icon="box"
              label="Size"
              value={load.cubic_feet_estimate
                ? `${load.cubic_feet_estimate.toLocaleString()} CF`
                : 'TBD'}
            />
            <DetailItem
              icon="package"
              label="Weight"
              value={load.weight_lbs_estimate
                ? `${load.weight_lbs_estimate.toLocaleString()} lbs`
                : 'TBD'}
            />
            <DetailItem
              icon="layers"
              label="Pieces"
              value={load.pieces_count?.toString() || 'TBD'}
            />
            <DetailItem
              icon="truck"
              label="Equipment"
              value={load.equipment_type || 'Any'}
            />
          </View>
        </View>

        {/* Dates Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dates</Text>
          <View style={styles.detailsGrid}>
            {load.rfd_date && (
              <DetailItem
                icon="calendar"
                label="RFD Date"
                value={formatDate(load.rfd_date)}
              />
            )}
            {load.pickup_date_start && (
              <DetailItem
                icon="clock"
                label="Pickup Window"
                value={`${formatDate(load.pickup_date_start)}${load.pickup_date_end && load.pickup_date_end !== load.pickup_date_start
                  ? ` - ${formatDate(load.pickup_date_end)}`
                  : ''
                  }`}
              />
            )}
          </View>
        </View>

        {/* Company Card */}
        {load.company && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Posted By</Text>
            <View style={styles.companyRow}>
              <View style={styles.companyIcon}>
                <Icon name="building" size="md" color={colors.primary} />
              </View>
              <View style={styles.companyDetails}>
                <Text style={styles.companyName}>{load.company.name}</Text>
                {(load.company.city || load.company.state) && (
                  <Text style={styles.companyLocation}>
                    {[load.company.city, load.company.state].filter(Boolean).join(', ')}
                  </Text>
                )}
                {(load.company.mc_number || load.company.dot_number) && (
                  <Text style={styles.companyCredentials}>
                    {load.company.mc_number && `MC: ${load.company.mc_number}`}
                    {load.company.mc_number && load.company.dot_number && ' • '}
                    {load.company.dot_number && `DOT: ${load.company.dot_number}`}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {load.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{load.notes}</Text>
          </View>
        )}

        {/* Request Status */}
        {hasRequested && (
          <View style={[styles.card, styles.statusCard]}>
            <View style={styles.statusHeader}>
              <Icon
                name={existingRequest.status === 'pending' ? 'clock' :
                  existingRequest.status === 'accepted' ? 'check-circle' : 'x-circle'}
                size="md"
                color={existingRequest.status === 'pending' ? colors.warning :
                  existingRequest.status === 'accepted' ? colors.success : colors.error}
              />
              <Text style={styles.statusTitle}>
                {existingRequest.status === 'pending' ? 'Request Pending' :
                  existingRequest.status === 'accepted' ? 'Request Accepted' :
                    existingRequest.status === 'declined' ? 'Request Declined' : 'Request ' + existingRequest.status}
              </Text>
            </View>
            {existingRequest.message && (
              <Text style={styles.statusMessage}>Your message: "{existingRequest.message}"</Text>
            )}
          </View>
        )}

        {/* Request Form */}
        {showRequestForm && !hasRequested && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Send Request</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Add a message (optional)"
              placeholderTextColor={colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Action Button */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {hasRequested ? (
          canWithdraw ? (
            <Pressable
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={handleWithdrawRequest}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <>
                  <Icon name="x" size="md" color={colors.error} />
                  <Text style={styles.withdrawButtonText}>Withdraw Request</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={[styles.actionButton, styles.disabledButton]}>
              <Text style={styles.disabledButtonText}>
                {existingRequest.status === 'accepted' ? 'Request Accepted' : 'Request Processed'}
              </Text>
            </View>
          )
        ) : showRequestForm ? (
          <Pressable
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleRequestLoad}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon name="send" size="md" color={colors.white} />
                <Text style={styles.primaryButtonText}>Send Request</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => {
              haptics.tap();
              setShowRequestForm(true);
            }}
          >
            <Icon name="truck" size="md" color={colors.white} />
            <Text style={styles.primaryButtonText}>Request This Load</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailItem}>
      <Icon name={icon} size="sm" color={colors.textMuted} />
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  backButtonAlt: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  backButtonAltText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  loadNumber: {
    flex: 1,
    ...typography.headline,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.screenPadding,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  typeBadgeText: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeContainer: {
    paddingLeft: spacing.sm,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dotOrigin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    marginTop: 4,
    marginRight: spacing.md,
  },
  dotDestination: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 4,
    marginRight: spacing.md,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.border,
    marginLeft: 5,
    marginVertical: spacing.xs,
  },
  locationInfo: {
    flex: 1,
  },
  cityLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  cityName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  zipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rateAmount: {
    ...typography.hero,
    color: colors.success,
  },
  ratePerCuft: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  counterBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  detailsGrid: {
    gap: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  companyLocation: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  companyCredentials: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  notesText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  statusCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusMessage: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  messageInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomSpacer: {
    height: 100,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
  withdrawButton: {
    backgroundColor: colors.errorSoft,
  },
  withdrawButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.error,
  },
  disabledButton: {
    backgroundColor: colors.border,
  },
  disabledButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
