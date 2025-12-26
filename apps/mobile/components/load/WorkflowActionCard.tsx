/**
 * WorkflowActionCard Component
 *
 * Premium action card that guides drivers through the load lifecycle.
 * Design inspired by flight apps - clear, focused, and beautiful.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLoadActions } from '../../hooks/useLoadActions';
import { useToast } from '../ui';
import { LoadStatus } from '../../types';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

interface WorkflowActionCardProps {
  loadId: string;
  tripId: string;
  loadStatus: LoadStatus;
  loadSource: 'own_customer' | 'partner' | 'marketplace' | null;
  postingType: 'pickup' | 'load' | 'live_load' | null;
  pickupCompletedAt: string | null;
  arrivedAtDelivery: string | null;
  actions: ReturnType<typeof useLoadActions>;
  balanceDue: number | null;
  company?: { name: string; phone: string | null; trust_level?: 'trusted' | 'cod_required' } | null;
  deliveryOrder: number | null;
  loadUpdatedAt: string;
}

// Icon component for action cards
function ActionIcon({ name, color, size = 28 }: { name: keyof typeof Ionicons.glyphMap; color: string; size?: number }) {
  return (
    <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

// Trust Level Badge - subtle and refined
function TrustBadge({ trustLevel }: { trustLevel: 'trusted' | 'cod_required' }) {
  const isTrusted = trustLevel === 'trusted';
  return (
    <View style={[styles.trustBadge, isTrusted ? styles.trustBadgeTrusted : styles.trustBadgeCod]}>
      <Ionicons
        name={isTrusted ? 'checkmark-circle' : 'alert-circle'}
        size={14}
        color={isTrusted ? colors.success : colors.warning}
      />
      <Text style={[styles.trustBadgeText, { color: isTrusted ? colors.success : colors.warning }]}>
        {isTrusted ? 'Trusted' : 'Verify Before Unload'}
      </Text>
    </View>
  );
}

// Delivery Order Badge
function DeliveryOrderBadge({ order }: { order: number }) {
  return (
    <View style={styles.deliveryBadge}>
      <Text style={styles.deliveryBadgeText}>Delivery #{order}</Text>
    </View>
  );
}

// Primary Action Button
function ActionButton({
  label,
  onPress,
  loading,
  variant = 'primary',
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'success' | 'warning';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const buttonStyles = {
    primary: { bg: colors.primary, text: colors.white, shadow: shadows.glow },
    success: { bg: colors.success, text: colors.white, shadow: shadows.glowSuccess },
    warning: { bg: colors.warning, text: colors.textInverse, shadow: shadows.none },
  };

  const style = buttonStyles[variant];

  return (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: style.bg }, style.shadow, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={style.text} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <Ionicons name={icon} size={20} color={style.text} style={styles.buttonIcon} />}
          <Text style={[styles.actionButtonText, { color: style.text }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function WorkflowActionCard({
  loadId,
  tripId,
  loadStatus: rawLoadStatus,
  loadSource,
  postingType,
  pickupCompletedAt,
  arrivedAtDelivery,
  actions,
  balanceDue,
  company,
  deliveryOrder,
  loadUpdatedAt,
}: WorkflowActionCardProps) {
  const router = useRouter();
  const toast = useToast();
  const trustLevel = company?.trust_level || 'cod_required';
  // Default to 'pending' if load_status is null/undefined (handles legacy data)
  const loadStatus = rawLoadStatus || 'pending';

  // Delivery order check state
  const [deliveryOrderCheck, setDeliveryOrderCheck] = useState<{
    allowed: boolean;
    reason?: string;
    checking: boolean;
  }>({ allowed: true, checking: true, reason: undefined });

  // Check delivery order when status is 'loaded' or when load/trip is updated
  useEffect(() => {
    if (loadStatus === 'loaded') {
      setDeliveryOrderCheck((prev) => ({ ...prev, checking: true }));
      actions.checkDeliveryOrder().then((result) => {
        setDeliveryOrderCheck({
          allowed: result.allowed,
          reason: result.reason,
          checking: false,
        });
      });
    } else {
      setDeliveryOrderCheck({ allowed: true, checking: false, reason: undefined });
    }
  }, [loadStatus, loadUpdatedAt]);

  // Check if this load requires pickup completion (pickup from customer's home)
  const requiresPickupCompletion = postingType === 'pickup' && !pickupCompletedAt;

  // Check if this load requires contract details entry after loading
  const requiresContractDetails =
    (loadSource === 'partner' || loadSource === 'marketplace') && !requiresPickupCompletion;

  const handleAction = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    const result = await action();
    if (!result.success) {
      toast.error(result.error || 'Action failed');
    }
  };

  // Handle "I've Arrived" - marks arrival and auto-navigates to collect-payment
  const handleMarkArrived = async () => {
    const result = await actions.markArrived();
    if (result.success) {
      router.push(`/trips/${tripId}/loads/${loadId}/collect-payment`);
    } else {
      toast.error(result.error || 'Failed to mark arrival');
    }
  };

  // Pending → Accept
  if (loadStatus === 'pending') {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ActionIcon name="document-text-outline" color={colors.warning} />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Review & Accept</Text>
            <Text style={styles.cardSubtitle}>New load assignment</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>Review the load details and confirm when ready to proceed.</Text>
        <ActionButton
          label={actions.loading ? 'Accepting...' : 'Accept Load'}
          onPress={() => handleAction(actions.acceptLoad)}
          loading={actions.loading}
          icon="checkmark-circle-outline"
        />
      </View>
    );
  }

  // Accepted → Start Loading
  if (loadStatus === 'accepted') {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ActionIcon name="cube-outline" color={colors.info} />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Ready to Load</Text>
            <Text style={styles.cardSubtitle}>Begin pickup process</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>
          You'll enter starting CUFT and take a photo of the truck before loading.
        </Text>
        <ActionButton
          label="Start Loading"
          onPress={() => router.push(`/trips/${tripId}/loads/${loadId}/start-loading`)}
          icon="arrow-forward"
        />
      </View>
    );
  }

  // Loading → Finish Loading
  if (loadStatus === 'loading') {
    return (
      <View style={[styles.card, styles.cardActive]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, styles.iconPulse]}>
            <Ionicons name="cube" size={28} color={colors.primary} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Loading in Progress</Text>
            <Text style={styles.cardSubtitle}>Take your time</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>
          When finished, enter ending CUFT and photograph the loading report.
        </Text>
        <ActionButton
          label="Finish Loading"
          onPress={() => router.push(`/trips/${tripId}/loads/${loadId}/finish-loading`)}
          icon="checkmark-done"
        />
        {(requiresPickupCompletion || requiresContractDetails) && (
          <Text style={styles.nextStepHint}>
            <Ionicons name="information-circle" size={14} color={colors.textMuted} />{' '}
            {requiresPickupCompletion ? "You'll complete pickup details next" : "You'll enter contract details next"}
          </Text>
        )}
      </View>
    );
  }

  // Loaded → Start Delivery
  if (loadStatus === 'loaded') {
    if (deliveryOrderCheck.checking) {
      return (
        <View style={styles.card}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.loadingText}>Checking delivery order...</Text>
          </View>
        </View>
      );
    }

    if (!deliveryOrderCheck.allowed) {
      return (
        <View style={[styles.card, styles.cardBlocked]}>
          <View style={styles.cardHeader}>
            <ActionIcon name="lock-closed" color={colors.textMuted} />
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Delivery Locked</Text>
              {deliveryOrder && <DeliveryOrderBadge order={deliveryOrder} />}
            </View>
          </View>
          <View style={styles.blockedContent}>
            <Text style={styles.blockedReason}>{deliveryOrderCheck.reason}</Text>
            <Text style={styles.blockedHint}>Complete earlier deliveries first to unlock this one.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ActionIcon name="navigate" color={colors.success} />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Ready for Delivery</Text>
            {deliveryOrder && <DeliveryOrderBadge order={deliveryOrder} />}
          </View>
        </View>
        <Text style={styles.cardDescription}>Loading complete. Start delivery when you're ready to drive.</Text>
        <ActionButton
          label={actions.loading ? 'Starting...' : 'Start Delivery'}
          onPress={() => handleAction(actions.startDelivery)}
          loading={actions.loading}
          variant="success"
          icon="navigate"
        />
      </View>
    );
  }

  // In Transit
  if (loadStatus === 'in_transit') {
    const effectiveBalanceDue = balanceDue || 0;
    const hasBalanceDue = effectiveBalanceDue > 0;
    const hasArrived = !!arrivedAtDelivery;

    // Not arrived yet
    if (!hasArrived) {
      return (
        <View style={[styles.card, styles.cardInTransit]}>
          <View style={styles.transitHeader}>
            <View style={styles.transitIconContainer}>
              <Ionicons name="car" size={32} color={colors.primary} />
            </View>
            <Text style={styles.transitTitle}>In Transit</Text>
            <Text style={styles.transitSubtitle}>Driving to delivery location</Text>
          </View>
          <ActionButton
            label={actions.loading ? 'Confirming...' : "I've Arrived"}
            onPress={handleMarkArrived}
            loading={actions.loading}
            icon="location"
          />
        </View>
      );
    }

    // Arrived - ready for payment/completion
    return (
      <View style={[styles.card, styles.cardArrived]}>
        <View style={styles.arrivedHeader}>
          <View style={styles.arrivedIconContainer}>
            <Ionicons name="location" size={32} color={colors.success} />
          </View>
          <Text style={styles.arrivedTitle}>{hasBalanceDue ? 'Collect Payment' : 'Complete Delivery'}</Text>
          <TrustBadge trustLevel={trustLevel} />
        </View>
        <Text style={styles.arrivedDescription}>
          {hasBalanceDue
            ? `Collect $${effectiveBalanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })} before unloading`
            : 'Confirm payment status to complete delivery'}
        </Text>
        <ActionButton
          label={hasBalanceDue ? `Collect $${effectiveBalanceDue.toFixed(2)}` : 'Complete Delivery'}
          onPress={() => router.push(`/trips/${tripId}/loads/${loadId}/collect-payment`)}
          variant="success"
          icon={hasBalanceDue ? 'cash' : 'checkmark-circle'}
        />
      </View>
    );
  }

  // Delivered
  if (loadStatus === 'delivered') {
    return (
      <View style={[styles.card, styles.cardCompleted]}>
        <View style={styles.completedContent}>
          <View style={styles.completedIconContainer}>
            <Ionicons name="checkmark-circle" size={40} color={colors.success} />
          </View>
          <Text style={styles.completedTitle}>Delivered</Text>
          <Text style={styles.completedSubtitle}>This load has been completed successfully</Text>
        </View>
      </View>
    );
  }

  // Storage completed
  if (loadStatus === 'storage_completed') {
    return (
      <View style={[styles.card, styles.cardCompleted]}>
        <View style={styles.completedContent}>
          <View style={styles.completedIconContainer}>
            <Ionicons name="cube" size={40} color={colors.info} />
          </View>
          <Text style={styles.completedTitle}>In Storage</Text>
          <Text style={styles.completedSubtitle}>This load is safely stored</Text>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // Base Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActive: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  cardBlocked: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  cardInTransit: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  cardArrived: {
    backgroundColor: colors.surface,
    borderColor: colors.success,
  },
  cardCompleted: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },

  // Icon Container
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPulse: {
    backgroundColor: colors.primarySoft,
  },

  // Action Button
  actionButton: {
    borderRadius: radius.button,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  actionButtonText: {
    ...typography.button,
    fontWeight: '600',
  },

  // Trust Badge
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.badge,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  trustBadgeTrusted: {
    backgroundColor: colors.successSoft,
  },
  trustBadgeCod: {
    backgroundColor: colors.warningSoft,
  },
  trustBadgeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },

  // Delivery Badge
  deliveryBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.badge,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  deliveryBadgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },

  // Blocked Card
  blockedContent: {
    marginTop: spacing.sm,
  },
  blockedReason: {
    ...typography.body,
    color: colors.warning,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  blockedHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },

  // Loading State
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  // Next Step Hint
  nextStepHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },

  // In Transit Card
  transitHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  transitIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  transitTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  transitSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  // Arrived Card
  arrivedHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  arrivedIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  arrivedTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  arrivedDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Completed Card
  completedContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  completedIconContainer: {
    marginBottom: spacing.md,
  },
  completedTitle: {
    ...typography.headline,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  completedSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});

export default WorkflowActionCard;
