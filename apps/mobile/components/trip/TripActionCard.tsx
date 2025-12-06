/**
 * TripActionCard Component
 *
 * Shows the primary action for a trip based on its status:
 * - Planned: Start Trip button
 * - Active/En Route: Next step guidance or Complete Trip
 * - Completed/Settled: Completion status
 */

import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../ui';
import { TripStatus, TripLoad } from '../../types';
import { useTripActions } from '../../hooks/useTripActions';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface TripActionCardProps {
  status: TripStatus;
  actions: ReturnType<typeof useTripActions>;
  loadsCount: number;
  nextStep: { load: TripLoad; action: string } | null;
  tripId: string;
}

export function TripActionCard({
  status,
  actions,
  loadsCount,
  nextStep,
  tripId,
}: TripActionCardProps) {
  const router = useRouter();

  // Planned → Navigate to full-screen start experience
  if (status === 'planned') {
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Ready to Roll?</Text>
        <Text style={styles.actionDescription}>
          {loadsCount > 0
            ? `${loadsCount} load${loadsCount > 1 ? 's' : ''} assigned`
            : 'No loads assigned yet'}
        </Text>

        <TouchableOpacity
          style={styles.startTripButton}
          onPress={() => router.push(`/(app)/trips/${tripId}/start`)}
        >
          <View style={styles.startTripButtonContent}>
            <Text style={styles.startTripButtonText}>Start Trip</Text>
            <Icon name="rocket" size="md" color={colors.white} />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Active/En Route → Show next step or complete trip
  if (status === 'active' || status === 'en_route') {
    const handleCompleteTrip = async () => {
      const result = await actions.completeTrip();
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to complete trip');
      }
    };

    // If there's a next step, show guidance to the next load
    if (nextStep) {
      const loadLabel = nextStep.load.loads.load_type === 'pickup' ? 'Pickup' : 'Load';
      const loadNumber =
        nextStep.load.loads.job_number ||
        nextStep.load.loads.load_number ||
        `${nextStep.load.sequence_index + 1}`;

      return (
        <View style={styles.nextStepCard}>
          <View style={styles.nextStepHeader}>
            <Text style={styles.nextStepLabel}>NEXT STEP</Text>
          </View>
          <Text style={styles.nextStepTitle}>{nextStep.action}</Text>
          <Text style={styles.nextStepDescription}>
            {loadLabel} #{loadNumber}
          </Text>
          <TouchableOpacity
            style={styles.nextStepButton}
            onPress={() =>
              router.push(`/(app)/trips/${tripId}/loads/${nextStep.load.loads.id}`)
            }
          >
            <Text style={styles.nextStepButtonText}>Go to {loadLabel}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // All loads delivered - show complete trip
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>All Loads Completed!</Text>
        <Text style={styles.actionDescription}>Ready to complete this trip</Text>
        <TouchableOpacity
          style={[styles.completeButton, actions.loading && styles.buttonDisabled]}
          onPress={handleCompleteTrip}
          disabled={actions.loading}
        >
          <Text style={styles.primaryButtonText}>
            {actions.loading ? 'Completing...' : 'Complete Trip'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Completed/Settled → No action needed
  if (status === 'completed' || status === 'settled') {
    return (
      <View style={styles.completedCard}>
        <Text style={styles.completedText}>
          {status === 'completed' ? '✓ Trip Completed' : '✓ Trip Settled'}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.sectionGap,
  },
  actionTitle: {
    ...typography.headline,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  actionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completedCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
    alignItems: 'center',
  },
  completedText: {
    ...typography.subheadline,
    color: colors.success,
    fontWeight: '600',
  },
  // Next Step Card
  nextStepCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.sectionGap,
  },
  nextStepHeader: {
    marginBottom: spacing.sm,
  },
  nextStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  nextStepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  nextStepDescription: {
    ...typography.subheadline,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.lg,
  },
  nextStepButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  nextStepButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  // Start Trip Button
  startTripButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    minHeight: 44,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  startTripButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  startTripButtonText: {
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default TripActionCard;
