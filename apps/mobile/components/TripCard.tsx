/**
 * TripCard - Premium Trip Card Component
 *
 * Features:
 * - Smooth press animations (scale 0.97)
 * - Premium design system styling
 * - Shows CUFT, loads count, estimated pay
 * - Subtle shadows for depth
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Trip } from '../types';
import { StatusBadge } from './StatusBadge';
import { Icon } from './ui';
import { colors, typography, spacing, radius, shadows } from '../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TripCardProps {
  trip: Trip;
  variant?: 'default' | 'compact';
}

export function TripCard({ trip, variant = 'default' }: TripCardProps) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const formatRoute = () => {
    const origin = [trip.origin_city, trip.origin_state].filter(Boolean).join(', ');
    const destination = [trip.destination_city, trip.destination_state].filter(Boolean).join(', ');
    if (origin && destination) {
      return `${origin} → ${destination}`;
    }
    return origin || destination || 'Route pending';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get loads count from trip_loads
  const loadsCount = (trip as any).trip_loads?.length || 0;

  // Estimate pay (if available)
  const estimatedPay = (trip as any).estimated_driver_pay || (trip as any).driver_pay;

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, []);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(app)/trips/${trip.id}`);
  }, [trip.id, router]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (variant === 'compact') {
    return (
      <AnimatedPressable
        style={[styles.compactCard, animatedStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <View style={styles.compactHeader}>
          <View style={styles.compactTitleRow}>
            <Icon name="truck" size="sm" color={colors.primary} />
            <Text style={styles.compactTripNumber}>Trip #{trip.trip_number}</Text>
          </View>
          <StatusBadge status={trip.status} size="small" />
        </View>

        <Text style={styles.compactRoute} numberOfLines={1}>
          {formatRoute()}
        </Text>

        <View style={styles.compactDetails}>
          {trip.start_date && (
            <View style={styles.compactDetailItem}>
              <Icon name="calendar" size="xs" color={colors.textMuted} />
              <Text style={styles.compactDetailText}>{formatDate(trip.start_date)}</Text>
            </View>
          )}
          {loadsCount > 0 && (
            <View style={styles.compactDetailItem}>
              <Icon name="package" size="xs" color={colors.textMuted} />
              <Text style={styles.compactDetailText}>
                {loadsCount} load{loadsCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {trip.total_cuft && trip.total_cuft > 0 && (
            <View style={styles.compactDetailItem}>
              <Icon name="box" size="xs" color={colors.textMuted} />
              <Text style={styles.compactDetailText}>
                {trip.total_cuft.toLocaleString()} CUFT
              </Text>
            </View>
          )}
        </View>

        {estimatedPay && (
          <View style={styles.compactPayRow}>
            <Text style={styles.compactPayLabel}>Est. Pay</Text>
            <Text style={styles.compactPayValue}>
              ${estimatedPay.toLocaleString()}
            </Text>
          </View>
        )}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Icon name="truck" size="md" color={colors.primary} />
            <Text style={styles.tripNumber}>Trip #{trip.trip_number}</Text>
          </View>
          <Text style={styles.route} numberOfLines={2}>{formatRoute()}</Text>
        </View>
        <StatusBadge status={trip.status} />
      </View>

      <View style={styles.details}>
        {trip.start_date && (
          <View style={styles.detailItem}>
            <View style={styles.detailIconRow}>
              <Icon name="calendar" size="sm" color={colors.textMuted} />
              <Text style={styles.detailLabel}>Date</Text>
            </View>
            <Text style={styles.detailValue}>{formatDate(trip.start_date)}</Text>
          </View>
        )}
        {loadsCount > 0 && (
          <View style={styles.detailItem}>
            <View style={styles.detailIconRow}>
              <Icon name="package" size="sm" color={colors.textMuted} />
              <Text style={styles.detailLabel}>Loads</Text>
            </View>
            <Text style={styles.detailValue}>{loadsCount}</Text>
          </View>
        )}
        {trip.total_cuft && trip.total_cuft > 0 && (
          <View style={styles.detailItem}>
            <View style={styles.detailIconRow}>
              <Icon name="box" size="sm" color={colors.textMuted} />
              <Text style={styles.detailLabel}>CUFT</Text>
            </View>
            <Text style={styles.detailValue}>{trip.total_cuft.toLocaleString()}</Text>
          </View>
        )}
        {trip.actual_miles && (
          <View style={styles.detailItem}>
            <View style={styles.detailIconRow}>
              <Icon name="navigation" size="sm" color={colors.textMuted} />
              <Text style={styles.detailLabel}>Miles</Text>
            </View>
            <Text style={styles.detailValue}>{trip.actual_miles.toLocaleString()}</Text>
          </View>
        )}
      </View>

      {estimatedPay && (
        <View style={styles.paySection}>
          <Text style={styles.payLabel}>Estimated Pay</Text>
          <Text style={styles.payValue}>${estimatedPay.toLocaleString()}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.viewDetails}>View Details</Text>
        <Icon name="chevron-right" size="sm" color={colors.primary} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // Default variant
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tripNumber: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  route: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xl + spacing.sm,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailItem: {
    minWidth: 70,
  },
  detailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  detailLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
  },
  detailValue: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginLeft: spacing.lg + spacing.xs,
  },
  paySection: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  payLabel: {
    ...typography.caption,
    color: colors.success,
  },
  payValue: {
    ...typography.headline,
    color: colors.success,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  viewDetails: {
    ...typography.buttonSmall,
    color: colors.primary,
  },

  // Compact variant
  compactCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactTripNumber: {
    ...typography.subheadline,
    color: colors.textPrimary,
  },
  compactRoute: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  compactDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  compactDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactDetailText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  compactPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  compactPayLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  compactPayValue: {
    ...typography.subheadline,
    color: colors.success,
    fontWeight: '600',
  },
});
