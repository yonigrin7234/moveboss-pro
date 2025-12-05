/**
 * NextActionCard - The ONE thing the driver needs to do now
 *
 * A prominent, full-width card that shows the single most important
 * action. Designed for 1-tap execution whenever possible.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { springs } from '../../lib/animations';
import { haptics } from '../../lib/haptics';
import {
  NextAction,
  ActionType,
  getActionColor,
} from '../../lib/getNextAction';
import { Icon } from './Icon';

interface NextActionCardProps {
  action: NextAction;
  onAction?: () => void;
}

export function NextActionCard({ action, onAction }: NextActionCardProps) {
  const router = useRouter();
  const scale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  // Pulse animation for urgent actions - with cleanup
  React.useEffect(() => {
    if (action.type === 'collect_payment' || action.type === 'complete_delivery') {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }

    // Cleanup: cancel animation on unmount
    return () => {
      pulseOpacity.value = 0.5;
    };
  }, [action.type]);

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.98, springs.snappy);
    setTimeout(() => {
      scale.value = withSpring(1, springs.snappy);
    }, 100);

    haptics.action();

    if (onAction) {
      onAction();
    } else {
      router.push(action.route as any);
    }
  }, [action.route, onAction, router]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  if (action.type === 'no_action') {
    return <NoActionCard />;
  }

  const actionColor = getActionColor(action.type);
  const isUrgent = action.type === 'collect_payment';
  const isPayment = action.type === 'collect_payment';

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Pressable onPress={handlePress} style={styles.pressable}>
        <LinearGradient
          colors={
            isPayment
              ? ['#22C55E', '#16A34A', '#15803D']
              : [colors.primary, colors.primaryMuted, '#4338CA']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Pulse overlay for urgent */}
          {isUrgent && (
            <Animated.View style={[styles.pulseOverlay, pulseStyle]} />
          )}

          {/* Content */}
          <View style={styles.content}>
            {/* Top row - action type badge */}
            <View style={styles.topRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {getActionLabel(action.type)}
                </Text>
              </View>
              {action.estimatedTime && (
                <Text style={styles.timeEstimate}>{action.estimatedTime}</Text>
              )}
            </View>

            {/* Main title */}
            <Text style={styles.title}>{action.title}</Text>

            {/* Subtitle with location/customer */}
            <Text style={styles.subtitle} numberOfLines={1}>
              {action.subtitle}
            </Text>

            {/* Amount for payment */}
            {isPayment && action.amount && (
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Amount Due</Text>
                <Text style={styles.amount}>
                  ${action.amount.toLocaleString()}
                </Text>
              </View>
            )}

            {/* Action button */}
            <View style={styles.actionRow}>
              <View style={styles.actionButton}>
                <Text style={styles.actionButtonText}>
                  {action.canSwipeToComplete ? 'Tap to Start' : 'Open'}
                </Text>
                <Icon name="arrow-right" size="sm" color={colors.white} />
              </View>

              {action.canSwipeToComplete && (
                <Text style={styles.swipeHint}>or swipe right</Text>
              )}
            </View>
          </View>
        </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function NoActionCard() {
  return (
    <View style={styles.noActionContainer}>
      <View style={styles.noActionContent}>
        <View style={styles.noActionIconContainer}>
          <Icon name="check-circle" size={48} color={colors.success} />
        </View>
        <Text style={styles.noActionTitle}>All Caught Up</Text>
        <Text style={styles.noActionSubtitle}>
          No pending tasks. Pull down to refresh.
        </Text>
      </View>
    </View>
  );
}

function getActionLabel(type: ActionType): string {
  switch (type) {
    case 'collect_payment':
      return 'PAYMENT DUE';
    case 'complete_delivery':
      return 'IN TRANSIT';
    case 'start_delivery':
      return 'READY TO DELIVER';
    case 'finish_loading':
      return 'LOADING';
    case 'start_loading':
      return 'READY TO LOAD';
    case 'accept_load':
      return 'NEW LOAD';
    case 'start_trip':
      return 'START TRIP';
    case 'complete_trip':
      return 'ALL DELIVERED';
    default:
      return 'ACTION';
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    ...shadows.glow,
  },
  pressable: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  pulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.label,
    color: colors.white,
    fontSize: 10,
  },
  timeEstimate: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  title: {
    ...typography.hero,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.lg,
  },
  amountContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  amountLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.xs,
  },
  amount: {
    ...typography.numericLarge,
    color: colors.white,
    fontSize: 42,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.white,
    marginRight: spacing.sm,
  },
  swipeHint: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  // No action state
  noActionContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  noActionContent: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  noActionIconContainer: {
    marginBottom: spacing.md,
  },
  noActionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  noActionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default NextActionCard;
