import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

  return (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Pickup</Text>
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
});
