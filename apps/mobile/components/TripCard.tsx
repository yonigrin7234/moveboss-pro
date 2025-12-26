/**
 * TripCard - Premium Trip Card Component
 *
 * Features:
 * - Smooth press animations (scale 0.97)
 * - Premium design system styling
 * - Shows CUFT, loads count, estimated pay
 * - Hero variant for active trips with gradient border
 * - Progress indicators for load delivery
 * - Subtle shadows for depth
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Trip } from '../types';
import { StatusBadge } from './StatusBadge';
import { Icon, IconWithBackground } from './ui';
import { colors, typography, spacing, radius, shadows } from '../lib/theme';

// Extended trip type that includes joined data from queries
interface TripWithDetails extends Trip {
  trip_loads?: { id: string }[];
  estimated_driver_pay?: number;
  driver_pay?: number;
  loads_total?: number;
  loads_delivered?: number;
}

interface TripCardProps {
  trip: TripWithDetails;
  variant?: 'default' | 'compact' | 'hero';
}

export function TripCard({ trip, variant = 'default' }: TripCardProps) {
  const router = useRouter();

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

  // Get loads count - prefer the new summary fields
  const loadsCount = trip.loads_total ?? trip.trip_loads?.length ?? 0;
  const loadsDelivered = trip.loads_delivered ?? 0;

  // Estimate pay (if available)
  const estimatedPay = trip.estimated_driver_pay || trip.driver_pay || trip.driver_pay_total;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(app)/trips/${trip.id}`);
  }, [trip.id, router]);

  // Progress percentage for hero variant
  const progressPercent = loadsCount > 0 ? Math.round((loadsDelivered / loadsCount) * 100) : 0;

  // Hero variant for active trips
  if (variant === 'hero') {
    return (
      <LinearGradient
        colors={[colors.primary, colors.primaryMuted, colors.border]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradientBorder}
      >
        <Pressable
          style={({ pressed }) => [
            styles.heroCard,
            pressed && styles.cardPressed,
          ]}
          onPress={handlePress}
        >
          {/* Header */}
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleRow}>
              <IconWithBackground
                name="truck"
                size="md"
                color={colors.primary}
                backgroundColor={colors.primarySoft}
                backgroundSizeMultiplier={1.4}
              />
              <View style={styles.heroTitleText}>
                <Text style={styles.heroTripNumber}>Trip #{trip.trip_number}</Text>
                <Text style={styles.heroRoute} numberOfLines={1}>
                  {formatRoute()}
                </Text>
              </View>
            </View>
            <StatusBadge status={trip.status} />
          </View>

          {/* Details Row */}
          <View style={styles.heroDetailsRow}>
            {trip.start_date && (
              <View style={styles.heroDetailItem}>
                <Icon name="calendar" size="sm" color={colors.textMuted} />
                <Text style={styles.heroDetailText}>{formatDate(trip.start_date)}</Text>
              </View>
            )}
            {trip.total_cuft && trip.total_cuft > 0 && (
              <View style={styles.heroDetailItem}>
                <Icon name="box" size="sm" color={colors.textMuted} />
                <Text style={styles.heroDetailText}>
                  {trip.total_cuft.toLocaleString()} CUFT
                </Text>
              </View>
            )}
          </View>

          {/* Progress Section */}
          {loadsCount > 0 && (
            <View style={styles.heroProgressSection}>
              <View style={styles.heroProgressHeader}>
                <View style={styles.heroProgressLabel}>
                  <Icon name="package" size="sm" color={colors.primary} />
                  <Text style={styles.heroProgressText}>
                    {loadsDelivered} of {loadsCount} load{loadsCount !== 1 ? 's' : ''} delivered
                  </Text>
                </View>
                <Text style={styles.heroProgressPercent}>{progressPercent}%</Text>
              </View>
              <View style={styles.heroProgressBar}>
                <View
                  style={[
                    styles.heroProgressFill,
                    { width: `${progressPercent}%` }
                  ]}
                />
              </View>
            </View>
          )}

          {/* Pay & Action Row */}
          <View style={styles.heroFooter}>
            {estimatedPay ? (
              <View style={styles.heroPayBadge}>
                <Icon name="dollar" size="sm" color={colors.success} />
                <Text style={styles.heroPayValue}>
                  ${estimatedPay.toLocaleString()}
                </Text>
              </View>
            ) : (
              <View />
            )}
            <View style={styles.heroAction}>
              <Text style={styles.heroActionText}>Continue Trip</Text>
              <Icon name="chevron-right" size="sm" color={colors.primary} />
            </View>
          </View>
        </Pressable>
      </LinearGradient>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.compactCard,
          pressed && styles.cardPressed,
        ]}
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
                {loadsDelivered > 0 ? `${loadsDelivered}/${loadsCount}` : loadsCount} load{loadsCount !== 1 ? 's' : ''}
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
      </Pressable>
    );
  }

  // Default variant
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
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
    </Pressable>
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
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
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

  // Hero variant
  heroGradientBorder: {
    borderRadius: radius.xl + 1,
    padding: 2,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  heroTitleText: {
    flex: 1,
  },
  heroTripNumber: {
    ...typography.headline,
    color: colors.textPrimary,
    fontSize: 18,
  },
  heroRoute: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  heroDetailsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroDetailText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  heroProgressSection: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  heroProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroProgressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroProgressText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  heroProgressPercent: {
    ...typography.subheadline,
    color: colors.primary,
    fontWeight: '600',
  },
  heroProgressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroPayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successSoft,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  heroPayValue: {
    ...typography.subheadline,
    color: colors.success,
    fontWeight: '600',
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroActionText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
});
