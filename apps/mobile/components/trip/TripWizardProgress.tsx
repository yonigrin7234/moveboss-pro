/**
 * TripWizardProgress Component
 *
 * Visual stepper showing progress through a multi-load trip.
 * - Shows all loads with their status (completed, current, upcoming)
 * - Highlights the current/next actionable load
 * - Displays route info and delivery order
 * - Provides clear visual hierarchy for flight-app-like experience
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Icon } from '../ui';
import { TripLoad, LoadStatus } from '../../types';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

interface TripWizardProgressProps {
  tripId: string;
  loads: TripLoad[];
  currentDeliveryIndex: number | null;
}

type LoadProgressStatus = 'completed' | 'current' | 'upcoming';

interface LoadStepInfo {
  tripLoad: TripLoad;
  progressStatus: LoadProgressStatus;
  stepNumber: number;
  action: string | null;
}

/**
 * Determine the progress status and action for a load
 */
function getLoadStepInfo(load: TripLoad, index: number, currentDeliveryIndex: number | null): LoadStepInfo {
  // Default to 'pending' if load_status is null/undefined (handles legacy data)
  const status = load.loads.load_status || 'pending';
  const deliveryOrder = load.loads.delivery_order;

  // Determine if load is completed, current, or upcoming
  let progressStatus: LoadProgressStatus;
  let action: string | null = null;

  if (status === 'delivered' || status === 'storage_completed') {
    progressStatus = 'completed';
  } else {
    // Check if this is the current actionable load
    const isCurrentByDeliveryOrder = deliveryOrder !== null &&
      currentDeliveryIndex !== null &&
      deliveryOrder === currentDeliveryIndex;

    const isFirstIncomplete = !['delivered', 'storage_completed'].includes(status);

    // Determine action based on status
    switch (status) {
      case 'pending':
        action = 'Accept Load';
        break;
      case 'accepted':
        action = 'Start Loading';
        break;
      case 'loading':
        action = 'Finish Loading';
        break;
      case 'loaded':
        action = 'Start Delivery';
        break;
      case 'in_transit':
        action = load.loads.arrived_at_delivery ? 'Collect Payment' : 'Mark Arrived';
        break;
      default:
        action = null;
    }

    // If this load has the current delivery index OR is the first incomplete, it's "current"
    if (isCurrentByDeliveryOrder || (action !== null && currentDeliveryIndex === null)) {
      progressStatus = 'current';
    } else {
      progressStatus = 'upcoming';
    }
  }

  return {
    tripLoad: load,
    progressStatus,
    stepNumber: index + 1,
    action,
  };
}

/**
 * Get location string for pickup or delivery
 */
function getLocationString(load: TripLoad['loads'], type: 'pickup' | 'delivery'): string {
  if (type === 'pickup') {
    return [load.pickup_city, load.pickup_state].filter(Boolean).join(', ') || 'TBD';
  }
  const city = load.dropoff_city || load.delivery_city;
  const state = load.dropoff_state || load.delivery_state;
  return [city, state].filter(Boolean).join(', ') || 'TBD';
}

/**
 * Get status display info
 */
function getStatusDisplay(status: LoadStatus): { label: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: colors.warning };
    case 'accepted':
      return { label: 'Accepted', color: colors.info };
    case 'loading':
      return { label: 'Loading', color: colors.primary };
    case 'loaded':
      return { label: 'Loaded', color: colors.primary };
    case 'in_transit':
      return { label: 'In Transit', color: colors.primary };
    case 'delivered':
      return { label: 'Delivered', color: colors.success };
    case 'storage_completed':
      return { label: 'Complete', color: colors.success };
    default:
      return { label: status, color: colors.textMuted };
  }
}

export function TripWizardProgress({ tripId, loads, currentDeliveryIndex }: TripWizardProgressProps) {
  const router = useRouter();

  if (loads.length === 0) {
    return null;
  }

  // Sort loads by delivery order first, then sequence index
  const sortedLoads = [...loads].sort((a, b) => {
    // First sort by delivery_order if both have it
    if (a.loads.delivery_order !== null && b.loads.delivery_order !== null) {
      return a.loads.delivery_order - b.loads.delivery_order;
    }
    // If only one has delivery_order, it comes first
    if (a.loads.delivery_order !== null) return -1;
    if (b.loads.delivery_order !== null) return 1;
    // Fall back to sequence_index
    return a.sequence_index - b.sequence_index;
  });

  // Build step info for each load
  const steps = sortedLoads.map((load, index) =>
    getLoadStepInfo(load, index, currentDeliveryIndex)
  );

  // Find the current step (first non-completed with action)
  const currentStep = steps.find(s => s.progressStatus === 'current');
  const completedCount = steps.filter(s => s.progressStatus === 'completed').length;
  const totalCount = steps.length;

  const handleLoadPress = (loadId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(app)/trips/${tripId}/loads/${loadId}`);
  };

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Trip Progress</Text>
          <Text style={styles.headerSubtitle}>
            {completedCount} of {totalCount} loads completed
          </Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressBadgeText}>
            {Math.round((completedCount / totalCount) * 100)}%
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(completedCount / totalCount) * 100}%` }
            ]}
          />
        </View>
      </View>

      {/* Load Steps */}
      <ScrollView
        style={styles.stepsContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const load = step.tripLoad.loads;
          // Use defaulted status to handle legacy null values
          const loadStatus = (load.load_status || 'pending') as LoadStatus;
          const statusDisplay = getStatusDisplay(loadStatus);
          const loadLabel = load.load_type === 'pickup' ? 'Pickup' : 'Load';
          const loadNumber = load.load_number || `${step.stepNumber}`;

          return (
            <TouchableOpacity
              key={step.tripLoad.id}
              style={[
                styles.stepItem,
                step.progressStatus === 'current' && styles.stepItemCurrent,
              ]}
              onPress={() => handleLoadPress(load.id)}
              activeOpacity={0.7}
            >
              {/* Step Indicator */}
              <View style={styles.stepIndicatorContainer}>
                <View style={[
                  styles.stepIndicator,
                  step.progressStatus === 'completed' && styles.stepIndicatorCompleted,
                  step.progressStatus === 'current' && styles.stepIndicatorCurrent,
                  step.progressStatus === 'upcoming' && styles.stepIndicatorUpcoming,
                ]}>
                  {step.progressStatus === 'completed' ? (
                    <Icon name="check" size="sm" color={colors.textPrimary} />
                  ) : step.progressStatus === 'current' ? (
                    <Text style={styles.stepNumberCurrent}>{step.stepNumber}</Text>
                  ) : (
                    <Text style={styles.stepNumber}>{step.stepNumber}</Text>
                  )}
                </View>
                {!isLast && (
                  <View style={[
                    styles.stepLine,
                    step.progressStatus === 'completed' && styles.stepLineCompleted,
                  ]} />
                )}
              </View>

              {/* Step Content */}
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepTitleRow}>
                    <Text style={[
                      styles.stepTitle,
                      step.progressStatus === 'completed' && styles.stepTitleCompleted,
                    ]}>
                      {loadLabel} #{loadNumber}
                    </Text>
                    {load.delivery_order && (
                      <View style={styles.deliveryOrderBadge}>
                        <Text style={styles.deliveryOrderText}>
                          Delivery #{load.delivery_order}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: `${statusDisplay.color}20` }
                  ]}>
                    <Text style={[styles.statusText, { color: statusDisplay.color }]}>
                      {statusDisplay.label}
                    </Text>
                  </View>
                </View>

                {/* Route */}
                <View style={styles.routeContainer}>
                  <View style={styles.routePoint}>
                    <View style={styles.routeDot} />
                    <Text style={styles.routeText}>
                      {getLocationString(load, 'pickup')}
                    </Text>
                  </View>
                  <View style={styles.routeArrow}>
                    <Icon name="arrow-right" size="xs" color={colors.textMuted} />
                  </View>
                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, styles.routeDotEnd]} />
                    <Text style={styles.routeText}>
                      {getLocationString(load, 'delivery')}
                    </Text>
                  </View>
                </View>

                {/* Action Prompt (only for current step) */}
                {step.progressStatus === 'current' && step.action && (
                  <View style={styles.actionPrompt}>
                    <Icon name="zap" size="sm" color={colors.warning} />
                    <Text style={styles.actionPromptText}>
                      Next: {step.action}
                    </Text>
                    <Icon name="chevron-right" size="sm" color={colors.warning} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    ...typography.headline,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  progressBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  progressBadgeText: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: spacing.lg,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  stepsContainer: {
    maxHeight: 400,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  stepItemCurrent: {
    backgroundColor: colors.primarySoft,
    marginHorizontal: -spacing.cardPadding,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    width: 32,
    marginRight: spacing.md,
  },
  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepIndicatorCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepIndicatorCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  stepIndicatorUpcoming: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  stepNumber: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 12,
  },
  stepNumberCurrent: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
  },
  stepContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepTitle: {
    ...typography.subheadline,
    fontWeight: '600',
  },
  stepTitleCompleted: {
    color: colors.textSecondary,
  },
  deliveryOrderBadge: {
    backgroundColor: colors.infoSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  deliveryOrderText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.info,
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  routeDotEnd: {
    backgroundColor: colors.success,
  },
  routeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  routeArrow: {
    opacity: 0.5,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  actionPromptText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
    flex: 1,
  },
});

export default TripWizardProgress;
