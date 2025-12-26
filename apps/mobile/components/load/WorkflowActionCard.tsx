/**
 * WorkflowActionCard Component
 *
 * Displays the appropriate action card based on load status.
 * Handles the entire load lifecycle: pending → accepted → loading → loaded → in_transit → delivered
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
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

// Trust Level Badge
function TrustLevelBadge({ trustLevel }: { trustLevel: 'trusted' | 'cod_required' }) {
  const isTrusted = trustLevel === 'trusted';
  return (
    <View style={[
      styles.trustBadge,
      isTrusted ? styles.trustBadgeTrusted : styles.trustBadgeCod
    ]}>
      <Text style={styles.trustBadgeText}>
        {isTrusted ? '✓ Trusted Company' : '⚠ Verify Before Unload'}
      </Text>
    </View>
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
      setDeliveryOrderCheck(prev => ({ ...prev, checking: true }));
      actions.checkDeliveryOrder().then(result => {
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
  const requiresContractDetails = (loadSource === 'partner' || loadSource === 'marketplace') && !requiresPickupCompletion;

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
      // Auto-navigate to collect-payment screen
      router.push(`/trips/${tripId}/loads/${loadId}/collect-payment`);
    } else {
      toast.error(result.error || 'Failed to mark arrival');
    }
  };

  // Pending → Accept
  if (loadStatus === 'pending') {
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Accept Load</Text>
        <Text style={styles.actionDescription}>
          Review the load details and accept when ready
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, actions.loading && styles.buttonDisabled]}
          onPress={() => handleAction(actions.acceptLoad)}
          disabled={actions.loading}
        >
          <Text style={styles.primaryButtonText}>
            {actions.loading ? 'Accepting...' : 'Accept Load'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Accepted → Start Loading (navigate to full-screen experience)
  if (loadStatus === 'accepted') {
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Ready to Load</Text>
        <Text style={styles.actionDescription}>
          Enter starting CUFT and take a photo of the truck
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push(`/trips/${tripId}/loads/${loadId}/start-loading`)}
        >
          <Text style={styles.primaryButtonText}>Start Loading</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading → Finish Loading (navigate to full-screen experience)
  if (loadStatus === 'loading') {
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Loading in Progress</Text>
        <Text style={styles.actionDescription}>
          When done, enter ending CUFT and take a photo of the loading report
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push(`/trips/${tripId}/loads/${loadId}/finish-loading`)}
        >
          <Text style={styles.primaryButtonText}>Finish Loading</Text>
        </TouchableOpacity>
        {requiresPickupCompletion && (
          <Text style={styles.contractDetailsHint}>
            You'll complete pickup details next
          </Text>
        )}
        {requiresContractDetails && !requiresPickupCompletion && (
          <Text style={styles.contractDetailsHint}>
            You'll enter contract details next
          </Text>
        )}
      </View>
    );
  }

  // Loaded → Start Delivery (drive to delivery location)
  if (loadStatus === 'loaded') {
    const deliveryOrderBadge = deliveryOrder ? (
      <View style={styles.deliveryOrderBadge}>
        <Text style={styles.deliveryOrderBadgeText}>Delivery #{deliveryOrder}</Text>
      </View>
    ) : null;

    if (deliveryOrderCheck.checking) {
      return (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Checking delivery order...</Text>
          {deliveryOrderBadge}
        </View>
      );
    }

    if (!deliveryOrderCheck.allowed) {
      return (
        <View style={[styles.actionCard, styles.blockedCard]}>
          <View style={styles.blockedHeader}>
            <Text style={styles.blockedIcon}>🔒</Text>
            <Text style={styles.blockedTitle}>Delivery Locked</Text>
          </View>
          {deliveryOrderBadge}
          <Text style={styles.blockedReason}>{deliveryOrderCheck.reason}</Text>
          <Text style={styles.blockedHint}>
            Loads must be delivered in order. Complete the earlier delivery first.
          </Text>
        </View>
      );
    }

    // Start delivery - driver will drive to delivery location
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Ready to Drive</Text>
        {deliveryOrderBadge}
        <Text style={styles.actionDescription}>
          Loading complete. Start delivery when ready to drive to the customer.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, actions.loading && styles.buttonDisabled]}
          onPress={() => handleAction(actions.startDelivery)}
          disabled={actions.loading}
        >
          <Text style={styles.primaryButtonText}>
            {actions.loading ? 'Starting...' : 'Start Delivery'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // In Transit → Two states: Not arrived yet OR Arrived (ready to collect payment)
  if (loadStatus === 'in_transit') {
    const effectiveBalanceDue = balanceDue || 0;
    const hasBalanceDue = effectiveBalanceDue > 0;
    const hasArrived = !!arrivedAtDelivery;

    // Not arrived yet - show "I've Arrived" button
    if (!hasArrived) {
      return (
        <View style={styles.inTransitCard}>
          <Text style={styles.inTransitEmoji}>🚛</Text>
          <Text style={styles.inTransitTitle}>In Transit</Text>
          <Text style={styles.inTransitDescription}>
            Tap when you arrive at the delivery location
          </Text>
          <TouchableOpacity
            style={[styles.arrivedButton, actions.loading && styles.buttonDisabled]}
            onPress={handleMarkArrived}
            disabled={actions.loading}
          >
            <Text style={styles.arrivedButtonText}>
              {actions.loading ? 'Confirming...' : "I've Arrived"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Arrived - show "Collect Payment" button
    return (
      <View style={styles.deliveryActionCard}>
        <Text style={styles.deliveryEmoji}>📍</Text>
        <Text style={styles.deliveryActionTitle}>
          {hasBalanceDue ? 'Collect Payment' : 'Complete Delivery'}
        </Text>
        <TrustLevelBadge trustLevel={trustLevel} />
        <Text style={styles.deliveryActionDescription}>
          {hasBalanceDue
            ? `Collect $${effectiveBalanceDue.toFixed(2)} before unloading`
            : 'Confirm payment status to complete delivery'}
        </Text>
        <TouchableOpacity
          style={styles.completeDeliveryButton}
          onPress={() => router.push(`/trips/${tripId}/loads/${loadId}/collect-payment`)}
        >
          <Text style={styles.completeDeliveryButtonText}>
            {hasBalanceDue ? `Collect $${effectiveBalanceDue.toFixed(2)}` : 'Complete Delivery'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Delivered
  if (loadStatus === 'delivered') {
    return (
      <View style={[styles.actionCard, styles.completedCard]}>
        <Text style={styles.completedTitle}>Delivered</Text>
        <Text style={styles.completedDescription}>
          This load has been completed
        </Text>
      </View>
    );
  }

  // Storage completed
  if (loadStatus === 'storage_completed') {
    return (
      <View style={[styles.actionCard, styles.completedCard]}>
        <Text style={styles.completedTitle}>In Storage</Text>
        <Text style={styles.completedDescription}>
          This load is in storage
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  actionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.sm,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    minHeight: 44,
  },
  photoButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.sm,
    padding: spacing.cardPadding,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    minHeight: 80,
  },
  photoButtonText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: radius.sm,
  },
  removePhotoText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  contractDetailsHint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: spacing.itemGap,
    fontStyle: 'italic',
  },
  // Trust Badge
  trustBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.itemGap,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    marginBottom: spacing.itemGap,
  },
  trustBadgeTrusted: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  trustBadgeCod: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  trustBadgeText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  // Delivery Order Badge
  deliveryOrderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  deliveryOrderBadgeText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  // Blocked Card
  blockedCard: {
    backgroundColor: colors.borderLight,
  },
  blockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  blockedIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  blockedTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  blockedReason: {
    ...typography.body,
    color: colors.warning,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  blockedHint: {
    ...typography.label,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  // Completed Card
  completedCard: {
    backgroundColor: colors.success,
  },
  completedTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  completedDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  // In Transit Card (not yet arrived)
  inTransitCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.sectionGap,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  inTransitEmoji: {
    fontSize: 48,
    marginBottom: spacing.itemGap,
  },
  inTransitTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  inTransitDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.sectionGap,
    textAlign: 'center',
  },
  arrivedButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.cardPadding,
    paddingHorizontal: 32,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    ...shadows.md,
  },
  arrivedButtonText: {
    ...typography.headline,
    color: colors.primary,
  },
  // Delivery Action Card (arrived, ready for payment)
  deliveryActionCard: {
    backgroundColor: colors.success,
    borderRadius: radius.card,
    padding: spacing.sectionGap,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  deliveryEmoji: {
    fontSize: 48,
    marginBottom: spacing.itemGap,
  },
  deliveryActionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  deliveryActionDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.sectionGap,
    textAlign: 'center',
  },
  completeDeliveryButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.cardPadding,
    paddingHorizontal: 32,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    ...shadows.md,
  },
  completeDeliveryButtonText: {
    ...typography.headline,
    color: colors.success,
  },
});

export default WorkflowActionCard;
