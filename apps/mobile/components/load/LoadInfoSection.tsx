import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DamageDocumentation } from '../DamageDocumentation';
import { colors, typography, spacing, radius } from '../../lib/theme';
import type { LoadDetail } from '../../types';

type LoadInfoSectionProps = {
  load: LoadDetail;
  loadId: string;
  pickupAddress: string;
  deliveryAddress: string;
  formatDate: (value: string | null) => string | null;
  onNavigatePickup: () => void;
  onNavigateDelivery: () => void;
  onCallPickupContact: () => void;
};

/**
 * Determines if this is an RFD-type load (loading from storage/company rather than customer)
 */
function isRFDLoad(load: LoadDetail): boolean {
  // Check load_type
  if (load.load_type === 'rfd') return true;

  // Check load_flow_type for storage/marketplace/carrier intake flows
  if (
    load.load_flow_type === 'storage_out_rfd' ||
    load.load_flow_type === 'marketplace_purchase' ||
    load.load_flow_type === 'carrier_intake'
  ) {
    return true;
  }

  return false;
}

/**
 * Determines if the load has already been picked up/loaded
 */
function isAlreadyLoaded(load: LoadDetail): boolean {
  return (
    load.load_status === 'loaded' ||
    load.load_status === 'in_transit' ||
    load.load_status === 'delivered' ||
    load.load_status === 'storage_completed'
  );
}

export function LoadInfoSection({
  load,
  loadId,
  pickupAddress,
  deliveryAddress,
  formatDate,
  onNavigatePickup,
  onNavigateDelivery,
  onCallPickupContact,
}: LoadInfoSectionProps) {
  const showDamages =
    (load.load_status === 'in_transit' || load.load_status === 'delivered') &&
    load.pre_existing_damages &&
    (load.pre_existing_damages as unknown as Array<unknown>).length > 0;

  const isRFD = isRFDLoad(load);
  const alreadyLoaded = isAlreadyLoaded(load);
  const pickupLabel = isRFD ? 'Loading Address' : 'Pickup';

  // For already-loaded loads, collapse the pickup/loading section by default
  const [showPickupDetails, setShowPickupDetails] = useState(!alreadyLoaded);

  return (
    <>
      {/* Pickup/Loading Address Card - collapsible when already loaded */}
      {alreadyLoaded ? (
        <Pressable
          style={styles.collapsedCard}
          onPress={() => setShowPickupDetails(!showPickupDetails)}
        >
          <View style={styles.collapsedHeader}>
            <View style={styles.collapsedTitleRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.collapsedTitle}>{pickupLabel}</Text>
              <Text style={styles.completedBadge}>Completed</Text>
            </View>
            <Ionicons
              name={showPickupDetails ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
          {showPickupDetails && (
            <View style={styles.collapsedContent}>
              <Text style={styles.addressMuted}>{pickupAddress}</Text>
              {load.pickup_date && (
                <Text style={styles.dateMuted}>{formatDate(load.pickup_date)}</Text>
              )}
            </View>
          )}
        </Pressable>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{pickupLabel}</Text>
            {load.pickup_date && <Text style={styles.cardDate}>{formatDate(load.pickup_date)}</Text>}
          </View>
          <Text style={styles.address}>{pickupAddress}</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionButton} onPress={onNavigatePickup}>
              <Text style={styles.actionButtonText}>Navigate</Text>
            </TouchableOpacity>
            {load.pickup_contact_phone && (
              <TouchableOpacity style={styles.actionButton} onPress={onCallPickupContact}>
                <Text style={styles.actionButtonText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
          {load.pickup_contact_name && (
            <Text style={styles.contactName}>Contact: {load.pickup_contact_name}</Text>
          )}
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Delivery</Text>
          {load.delivery_date && <Text style={styles.cardDate}>{formatDate(load.delivery_date)}</Text>}
        </View>
        <Text style={styles.address}>{deliveryAddress}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onNavigateDelivery}>
            <Text style={styles.actionButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Load Information</Text>
        <View style={styles.infoGrid}>
          {load.cubic_feet && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Estimated CUFT</Text>
              <Text style={styles.infoValue}>{load.cubic_feet}</Text>
            </View>
          )}
          {load.actual_cuft_loaded && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Actual CUFT</Text>
              <Text style={styles.infoValue}>{load.actual_cuft_loaded}</Text>
            </View>
          )}
          {load.weight_lbs_estimate && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Weight (lbs)</Text>
              <Text style={styles.infoValue}>{load.weight_lbs_estimate.toLocaleString()}</Text>
            </View>
          )}
          {load.pieces_count && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Pieces</Text>
              <Text style={styles.infoValue}>{load.pieces_count}</Text>
            </View>
          )}
        </View>
        {load.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.description}>{load.description}</Text>
          </View>
        )}
      </View>

      {showDamages && (
        <View style={styles.card}>
          <DamageDocumentation loadId={loadId} readonly />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.itemGap,
  },
  cardTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.itemGap,
  },
  cardDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  address: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.itemGap,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.itemGap,
  },
  actionButton: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  contactName: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  infoItem: {
    minWidth: '45%',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  descriptionSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Collapsed card styles (for already-loaded state)
  collapsedCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    opacity: 0.8,
  },
  collapsedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapsedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  collapsedTitle: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
  completedBadge: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  collapsedContent: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  addressMuted: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 20,
  },
  dateMuted: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
});
