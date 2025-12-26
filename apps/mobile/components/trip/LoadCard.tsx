/**
 * LoadCard Component
 *
 * Displays a load within a trip with route info, status, and action indicator.
 * Supports highlighting for the current actionable load.
 */

import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBadge } from '../StatusBadge';
import { Icon } from '../ui';
import { TripLoad } from '../../types';
import { getLoadAction } from '../../lib/tripUtils';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface LoadCardProps {
  tripLoad: TripLoad;
  tripId: string;
  /** Whether this load is the current actionable load in the trip */
  isCurrent?: boolean;
}

export function LoadCard({ tripLoad, tripId, isCurrent = false }: LoadCardProps) {
  const router = useRouter();
  const load = tripLoad.loads;

  // Determine load label based on load_type
  const getLoadLabel = () => {
    if (load.load_type === 'pickup') {
      return 'Pickup';
    }
    return 'Load';
  };

  const isLiveLoad = load.load_type === 'live_load';
  const isCompleted = load.load_status === 'delivered' || load.load_status === 'storage_completed';
  const loadLabel = getLoadLabel();
  // Pass arrived_at_delivery to get the correct action for in_transit loads
  const loadAction = getLoadAction(load.load_status, load.arrived_at_delivery);

  const getPickupLocation = () => {
    return [load.pickup_city, load.pickup_state].filter(Boolean).join(', ') || 'Not set';
  };

  const getDeliveryLocation = () => {
    const city = load.dropoff_city || load.delivery_city;
    const state = load.dropoff_state || load.delivery_state;
    return [city, state].filter(Boolean).join(', ') || 'Not set';
  };

  const handleCall = (phone: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const getDisplayTitle = () => {
    // Use load_number as primary identifier
    if (load.load_number) {
      return `${loadLabel} #${load.load_number}`;
    }
    return `${loadLabel} ${tripLoad.sequence_index + 1}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.loadCard,
        isCurrent && styles.loadCardCurrent,
        isCompleted && styles.loadCardCompleted,
      ]}
      onPress={() => router.push(`/(app)/trips/${tripId}/loads/${load.id}`)}
    >
      {/* Current indicator */}
      {isCurrent && (
        <View style={styles.currentIndicator}>
          <Icon name="zap" size="xs" color={colors.primary} />
          <Text style={styles.currentIndicatorText}>NEXT</Text>
        </View>
      )}

      {/* Completed checkmark */}
      {isCompleted && (
        <View style={styles.completedIndicator}>
          <Icon name="check-circle" size="sm" color={colors.success} />
        </View>
      )}

      <View style={styles.loadHeader}>
        <View style={styles.loadTitleRow}>
          <Text style={[
            styles.loadNumber,
            isCompleted && styles.loadNumberCompleted,
          ]}>{getDisplayTitle()}</Text>
          {isLiveLoad && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          {load.delivery_order && (
            <View style={styles.deliveryOrderBadge}>
              <Text style={styles.deliveryOrderBadgeText}>#{load.delivery_order}</Text>
            </View>
          )}
        </View>
        <StatusBadge status={load.load_status} size="small" />
      </View>

      <View style={styles.loadRoute}>
        <View style={styles.loadStop}>
          <View style={styles.stopDot} />
          <Text style={styles.loadLocation}>{getPickupLocation()}</Text>
        </View>
        <View style={styles.stopLine} />
        <View style={styles.loadStop}>
          <View style={[styles.stopDot, styles.stopDotEnd]} />
          <Text style={styles.loadLocation}>{getDeliveryLocation()}</Text>
        </View>
      </View>

      {load.companies?.name && (
        <View style={styles.loadCompany}>
          <Text style={styles.loadCompanyName}>{load.companies.name}</Text>
          {load.companies.phone && (
            <TouchableOpacity
              onPress={() => handleCall(load.companies?.phone || null)}
              style={styles.touchTarget}
            >
              <Text style={styles.callLink}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {load.actual_cuft_loaded && (
        <Text style={styles.loadCuft}>{load.actual_cuft_loaded} CUFT</Text>
      )}

      {loadAction && (
        <View style={[styles.loadActionBadge, { backgroundColor: loadAction.color }]}>
          <Text style={styles.loadActionText}>{loadAction.action} →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.itemGap,
    position: 'relative',
  },
  loadCardCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  loadCardCompleted: {
    opacity: 0.85,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  currentIndicator: {
    position: 'absolute',
    top: -8,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
    zIndex: 1,
  },
  currentIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  completedIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.itemGap,
  },
  loadNumber: {
    ...typography.subheadline,
  },
  loadNumberCompleted: {
    color: colors.textSecondary,
  },
  loadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  deliveryOrderBadge: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  deliveryOrderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loadRoute: {
    marginBottom: spacing.itemGap,
  },
  loadStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.itemGap,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  stopDotEnd: {
    backgroundColor: colors.success,
  },
  stopLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.borderLight,
    marginLeft: 4,
  },
  loadLocation: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  loadCompany: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.itemGap,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  loadCompanyName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  touchTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  callLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  loadCuft: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  loadActionBadge: {
    marginTop: spacing.itemGap,
    paddingVertical: 10,
    paddingHorizontal: spacing.cardPadding,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  loadActionText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default LoadCard;
