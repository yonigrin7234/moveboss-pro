/**
 * TripActionCard Component
 *
 * Premium action card showing the primary action for a trip.
 * Inspired by the owner app's hero cards with rich visual hierarchy.
 *
 * States:
 * - Planned: Start Trip with excitement
 * - Active/En Route: Next step guidance with location context
 * - All Loads Complete: Trip summary with earnings preview
 * - Completed/Settled: Success state
 */

import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Icon } from '../ui';
import { TripStatus } from '../../types';
import { useTripActions } from '../../hooks/useTripActions';
import { NextLoadInfo } from '../../lib/tripUtils';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

interface TripActionCardProps {
  status: TripStatus;
  actions: ReturnType<typeof useTripActions>;
  loadsCount: number;
  nextStep: NextLoadInfo | null;
  tripId: string;
  // Optional trip summary data for completion screen
  tripSummary?: {
    miles: number | null;
    totalCuft: number | null;
    totalCollected: number | null;
    totalExpenses: number | null;
  };
}

export function TripActionCard({
  status,
  actions,
  loadsCount,
  nextStep,
  tripId,
  tripSummary,
}: TripActionCardProps) {
  const router = useRouter();

  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    action();
  };

  // Planned → Navigate to full-screen start experience
  if (status === 'planned') {
    return (
      <View style={styles.heroCard}>
        <View style={styles.heroContent}>
          <View style={styles.heroIconContainer}>
            <Icon name="truck" size={28} color={colors.primary} />
          </View>
          <View style={styles.heroTextContent}>
            <Text style={styles.heroTitle}>Ready to Roll?</Text>
            <Text style={styles.heroSubtitle}>
              {loadsCount > 0
                ? `${loadsCount} load${loadsCount > 1 ? 's' : ''} assigned and waiting`
                : 'No loads assigned yet'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startTripButton}
          onPress={() => handlePress(() => router.push(`/(app)/trips/${tripId}/start`))}
          activeOpacity={0.8}
        >
          <View style={styles.startTripButtonContent}>
            <Icon name="rocket" size="md" color={colors.white} />
            <Text style={styles.startTripButtonText}>Start Trip</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Active/En Route → Show next step or complete trip
  if (status === 'active' || status === 'en_route') {
    const handleCompleteTrip = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const result = await actions.completeTrip();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', result.error || 'Failed to complete trip');
      }
    };

    // If there's a next step, show guidance to the next load with location context
    if (nextStep) {
      const loadLabel = nextStep.load.loads.load_type === 'pickup' ? 'Pickup' : 'Load';
      const loadNumber = nextStep.load.loads.load_number || `${nextStep.load.sequence_index + 1}`;
      const isDeliveryPhase = nextStep.load.loads.load_status === 'in_transit';
      const locationToShow = isDeliveryPhase ? nextStep.deliveryLocation : nextStep.pickupLocation;

      return (
        <View style={styles.nextStepCard}>
          <View style={styles.nextStepHeader}>
            <View style={styles.nextStepLabelContainer}>
              <Icon name="zap" size="xs" color={colors.warning} />
              <Text style={styles.nextStepLabel}>NEXT STEP</Text>
            </View>
            {nextStep.isDeliveryOrderEnforced && (
              <View style={styles.deliveryOrderTag}>
                <Icon name="route" size="xs" color={colors.textPrimary} />
                <Text style={styles.deliveryOrderTagText}>In Order</Text>
              </View>
            )}
          </View>

          <Text style={styles.nextStepTitle}>{nextStep.action}</Text>
          <Text style={styles.nextStepDescription}>
            {loadLabel} #{loadNumber}
          </Text>

          {/* Location Context */}
          <View style={styles.locationRow}>
            <Icon name="map-pin" size="sm" color="rgba(255,255,255,0.7)" />
            <Text style={styles.locationText}>{locationToShow}</Text>
          </View>

          {/* Route Preview for in_transit */}
          {isDeliveryPhase && (
            <View style={styles.routePreview}>
              <View style={styles.routePreviewDot} />
              <Text style={styles.routePreviewText}>{nextStep.pickupLocation}</Text>
              <Icon name="arrow-right" size="xs" color="rgba(255,255,255,0.5)" />
              <View style={[styles.routePreviewDot, styles.routePreviewDotEnd]} />
              <Text style={styles.routePreviewText}>{nextStep.deliveryLocation}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.nextStepButton}
            onPress={() => handlePress(() =>
              router.push(`/(app)/trips/${tripId}/loads/${nextStep.load.loads.id}`)
            )}
            activeOpacity={0.8}
          >
            <View style={styles.nextStepButtonContent}>
              <Text style={styles.nextStepButtonText}>Go to {loadLabel}</Text>
              <Icon name="arrow-right" size="sm" color={colors.textPrimary} />
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // All loads delivered - show complete trip with summary
    return (
      <View style={styles.completionCard}>
        <View style={styles.completionHeader}>
          <View style={styles.completionIconContainer}>
            <Icon name="check-circle" size={32} color={colors.success} />
          </View>
          <View style={styles.completionHeaderText}>
            <Text style={styles.completionTitle}>All Loads Delivered!</Text>
            <Text style={styles.completionSubtitle}>Ready to complete this trip</Text>
          </View>
        </View>

        {/* Trip Summary Grid */}
        {tripSummary && (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Miles</Text>
                <Text style={styles.summaryValue}>
                  {tripSummary.miles?.toLocaleString() || '—'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Cubic Feet</Text>
                <Text style={styles.summaryValue}>
                  {tripSummary.totalCuft?.toLocaleString() || '—'}
                </Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Collected</Text>
                <Text style={[styles.summaryValue, styles.summaryValueSuccess]}>
                  ${tripSummary.totalCollected?.toFixed(2) || '0.00'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={styles.summaryValue}>
                  ${tripSummary.totalExpenses?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.completeButton, actions.loading && styles.buttonDisabled]}
          onPress={handleCompleteTrip}
          disabled={actions.loading}
          activeOpacity={0.8}
        >
          <View style={styles.completeButtonContent}>
            <Icon name="check" size="md" color={colors.white} />
            <Text style={styles.completeButtonText}>
              {actions.loading ? 'Completing...' : 'Complete Trip'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Completed/Settled → Success state
  if (status === 'completed' || status === 'settled') {
    return (
      <View style={styles.successCard}>
        <View style={styles.successIconContainer}>
          <Icon name="check-circle" size={48} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>
          {status === 'completed' ? 'Trip Completed' : 'Trip Settled'}
        </Text>
        <Text style={styles.successSubtitle}>
          {status === 'completed'
            ? 'Great job! This trip has been completed.'
            : 'This trip has been settled and paid.'}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // Hero Card (Planned state)
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    ...shadows.md,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  heroTextContent: {
    flex: 1,
  },
  heroTitle: {
    ...typography.headline,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  startTripButton: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.glow,
    shadowColor: colors.success,
  },
  startTripButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  startTripButtonText: {
    ...typography.headline,
    color: colors.white,
    fontWeight: '700',
  },

  // Next Step Card (Active with pending loads)
  nextStepCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  nextStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  nextStepLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nextStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 1,
  },
  nextStepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  nextStepDescription: {
    ...typography.subheadline,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  locationText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  routePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  routePreviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  routePreviewDotEnd: {
    backgroundColor: colors.success,
  },
  routePreviewText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },
  deliveryOrderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  deliveryOrderTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  nextStepButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  nextStepButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextStepButtonText: {
    ...typography.button,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  // Completion Card (All loads delivered)
  completionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
    ...shadows.md,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  completionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  completionHeaderText: {
    flex: 1,
  },
  completionTitle: {
    ...typography.headline,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  completionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  summaryGrid: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.headline,
    fontWeight: '600',
  },
  summaryValueSuccess: {
    color: colors.success,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.glowSuccess,
  },
  completeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completeButtonText: {
    ...typography.headline,
    color: colors.white,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Success Card (Completed/Settled)
  successCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  successIconContainer: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.headline,
    color: colors.success,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default TripActionCard;
