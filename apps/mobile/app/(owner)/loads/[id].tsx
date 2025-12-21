/**
 * Load Detail Screen - View full load information
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';

interface LoadDetail {
  id: string;
  load_number: string;
  pickup_city: string | null;
  pickup_state: string | null;
  pickup_address: string | null;
  pickup_zip: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_address: string | null;
  delivery_zip: string | null;
  cubic_feet: number | null;
  weight_lbs: number | null;
  rate_per_cuft: number | null;
  total_rate: number | null;
  status: string;
  rfd_date: string | null;
  pickup_date: string | null;
  delivery_date: string | null;
  created_at: string;
  notes: string | null;
  special_instructions: string | null;
  posting_status: string | null;
  is_marketplace_visible: boolean | null;
  customer: {
    id: string;
    name: string;
  } | null;
  assigned_carrier: {
    id: string;
    name: string;
  } | null;
}

export default function LoadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: load, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['load-detail', id],
    queryFn: async (): Promise<LoadDetail | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('loads')
        .select(`
          id,
          load_number,
          pickup_city,
          pickup_state,
          pickup_address,
          pickup_zip,
          delivery_city,
          delivery_state,
          delivery_address,
          delivery_zip,
          cubic_feet,
          weight_lbs,
          rate_per_cuft,
          total_rate,
          status,
          rfd_date,
          pickup_date,
          delivery_date,
          created_at,
          notes,
          special_instructions,
          posting_status,
          is_marketplace_visible,
          customer:customer_id(
            id,
            name
          ),
          assigned_carrier:assigned_carrier_id(
            id,
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching load:', error);
        return null;
      }

      return {
        ...data,
        customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
        assigned_carrier: Array.isArray(data.assigned_carrier) ? data.assigned_carrier[0] : data.assigned_carrier,
      } as LoadDetail;
    },
    enabled: !!id,
  });

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount == null) return '-';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'assigned': return colors.info;
      case 'in_transit': return colors.primary;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.textMuted;
    }
  };

  const formatStatus = (status: string): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDaysUntilRfd = (): number | null => {
    if (!load?.rfd_date) return null;
    const rfdDate = new Date(load.rfd_date);
    const today = new Date();
    return Math.ceil((rfdDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysUntilRfd = getDaysUntilRfd();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!load) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Icon name="chevron-left" size="md" color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Load Details</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={[styles.centered, { flex: 1 }]}>
          <Icon name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>Load not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-left" size="md" color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Load Details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Load Number & Status */}
        <View style={styles.titleSection}>
          <Text style={styles.loadNumber}>{load.load_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(load.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(load.status) }]}>
              {formatStatus(load.status)}
            </Text>
          </View>
        </View>

        {/* RFD Alert */}
        {daysUntilRfd !== null && (
          <View style={[
            styles.rfdAlert,
            daysUntilRfd <= 0 ? styles.rfdAlertOverdue : daysUntilRfd <= 2 ? styles.rfdAlertCritical : styles.rfdAlertNormal,
          ]}>
            <Icon
              name="calendar"
              size="sm"
              color={daysUntilRfd <= 0 ? colors.error : daysUntilRfd <= 2 ? colors.warning : colors.info}
            />
            <Text style={[
              styles.rfdAlertText,
              { color: daysUntilRfd <= 0 ? colors.error : daysUntilRfd <= 2 ? colors.warning : colors.info },
            ]}>
              RFD: {formatDate(load.rfd_date)}
              {daysUntilRfd <= 0 ? ' (Overdue)' : daysUntilRfd === 1 ? ' (Tomorrow)' : daysUntilRfd <= 2 ? ` (${daysUntilRfd} days)` : ''}
            </Text>
          </View>
        )}

        {/* Route Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>

          <View style={styles.routeContainer}>
            {/* Pickup */}
            <View style={styles.locationBlock}>
              <View style={styles.locationIcon}>
                <Icon name="circle" size="sm" color={colors.success} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationCity}>
                  {load.pickup_city}, {load.pickup_state}
                </Text>
                {load.pickup_address && (
                  <Text style={styles.locationAddress}>{load.pickup_address}</Text>
                )}
                {load.pickup_zip && (
                  <Text style={styles.locationZip}>{load.pickup_zip}</Text>
                )}
                {load.pickup_date && (
                  <Text style={styles.locationDate}>📅 {formatDate(load.pickup_date)}</Text>
                )}
              </View>
            </View>

            {/* Route Line */}
            <View style={styles.routeLine} />

            {/* Delivery */}
            <View style={styles.locationBlock}>
              <View style={styles.locationIcon}>
                <Icon name="map-pin" size="sm" color={colors.error} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Delivery</Text>
                <Text style={styles.locationCity}>
                  {load.delivery_city}, {load.delivery_state}
                </Text>
                {load.delivery_address && (
                  <Text style={styles.locationAddress}>{load.delivery_address}</Text>
                )}
                {load.delivery_zip && (
                  <Text style={styles.locationZip}>{load.delivery_zip}</Text>
                )}
                {load.delivery_date && (
                  <Text style={styles.locationDate}>📅 {formatDate(load.delivery_date)}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Load Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Load Details</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Cubic Feet</Text>
              <Text style={styles.detailValue}>{load.cubic_feet ?? '-'} CF</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{load.weight_lbs ? `${load.weight_lbs.toLocaleString()} lbs` : '-'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Rate/CF</Text>
              <Text style={styles.detailValue}>{load.rate_per_cuft ? `$${load.rate_per_cuft}` : '-'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Total Rate</Text>
              <Text style={[styles.detailValue, styles.detailValueHighlight]}>
                {formatCurrency(load.total_rate || (load.cubic_feet && load.rate_per_cuft ? load.cubic_feet * load.rate_per_cuft : null))}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer & Carrier Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Parties</Text>

          {load.customer && (
            <View style={styles.partyRow}>
              <View style={styles.partyIcon}>
                <Icon name="building" size="sm" color={colors.primary} />
              </View>
              <View style={styles.partyInfo}>
                <Text style={styles.partyLabel}>Customer</Text>
                <Text style={styles.partyName}>{load.customer.name}</Text>
              </View>
            </View>
          )}

          {load.assigned_carrier && (
            <View style={styles.partyRow}>
              <View style={styles.partyIcon}>
                <Icon name="truck" size="sm" color={colors.success} />
              </View>
              <View style={styles.partyInfo}>
                <Text style={styles.partyLabel}>Assigned Carrier</Text>
                <Text style={styles.partyName}>{load.assigned_carrier.name}</Text>
              </View>
            </View>
          )}

          {!load.customer && !load.assigned_carrier && (
            <Text style={styles.emptyText}>No parties assigned</Text>
          )}
        </View>

        {/* Marketplace Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Marketplace</Text>
          <View style={styles.marketplaceRow}>
            <Icon
              name={load.is_marketplace_visible ? 'eye' : 'eye-off'}
              size="sm"
              color={load.is_marketplace_visible ? colors.success : colors.textMuted}
            />
            <Text style={[
              styles.marketplaceText,
              { color: load.is_marketplace_visible ? colors.success : colors.textMuted },
            ]}>
              {load.is_marketplace_visible ? 'Listed on marketplace' : 'Not listed'}
            </Text>
            {load.posting_status && (
              <View style={styles.postingBadge}>
                <Text style={styles.postingText}>{formatStatus(load.posting_status)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {(load.notes || load.special_instructions) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            {load.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>General Notes</Text>
                <Text style={styles.notesText}>{load.notes}</Text>
              </View>
            )}
            {load.special_instructions && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Special Instructions</Text>
                <Text style={styles.notesText}>{load.special_instructions}</Text>
              </View>
            )}
          </View>
        )}

        {/* Meta Info */}
        <View style={styles.metaSection}>
          <Text style={styles.metaText}>Created {formatDate(load.created_at)}</Text>
        </View>

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
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
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  loadNumber: {
    ...typography.title,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  rfdAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  rfdAlertOverdue: {
    backgroundColor: colors.errorSoft,
  },
  rfdAlertCritical: {
    backgroundColor: colors.warningSoft,
  },
  rfdAlertNormal: {
    backgroundColor: colors.infoSoft,
  },
  rfdAlertText: {
    ...typography.body,
    fontWeight: '600',
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  routeContainer: {
    position: 'relative',
  },
  locationBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.md,
    paddingTop: 2,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xxs,
  },
  locationCity: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  locationAddress: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  locationZip: {
    ...typography.caption,
    color: colors.textMuted,
  },
  locationDate: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  routeLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: 24,
    width: 2,
    backgroundColor: colors.border,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    marginBottom: spacing.md,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xxs,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  detailValueHighlight: {
    color: colors.success,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  partyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  partyInfo: {
    flex: 1,
  },
  partyLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  partyName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  marketplaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  marketplaceText: {
    ...typography.body,
    flex: 1,
  },
  postingBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  postingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  notesSection: {
    marginBottom: spacing.md,
  },
  notesLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  notesText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metaSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginTop: spacing.md,
  },
});
