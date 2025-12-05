/**
 * Driver Dashboard - Action-First Design
 *
 * Shows THE ONE THING the driver needs to do right now.
 * Every common action is 1-2 taps max.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../providers/AuthProvider';
import { useDriverProfile } from '../../hooks/useDriverProfile';
import { useDriverDashboard } from '../../hooks/useDriverDashboard';
import { useVehicleDocuments } from '../../hooks/useVehicleDocuments';
import {
  NextActionCard,
  QuickStats,
  SwipeableActionCard,
  Icon,
  IconName,
} from '../../components/ui';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { TripWithLoads } from '../../types';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { fullName } = useDriverProfile();
  const {
    nextAction,
    pendingActions,
    upcomingTrips,
    stats,
    loading,
    error,
    refetch,
  } = useDriverDashboard();
  const { hasActiveTrip, truck, trailer, expiredCount } =
    useVehicleDocuments();
  const router = useRouter();
  const [showUpcoming, setShowUpcoming] = useState(true);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
  }, [refetch]);

  const handleSignOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signOut();
  }, [signOut]);

  const navigateToTrip = useCallback(
    (trip: TripWithLoads) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/(app)/trips/${trip.id}`);
    },
    [router]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}
            {fullName ? ',' : ''}
          </Text>
          {fullName && <Text style={styles.driverName}>{fullName}</Text>}
        </View>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </Animated.View>

      {/* Error State */}
      {error && (
        <Animated.View entering={FadeInDown} style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      {/* THE ONE ACTION - Most prominent */}
      <Animated.View entering={FadeInUp.delay(200)}>
        <NextActionCard action={nextAction} />
      </Animated.View>

      {/* Quick Stats Row */}
      <Animated.View entering={FadeInUp.delay(300)}>
        <QuickStats
          earnings={stats.todayEarnings}
          miles={stats.todayMiles}
          loadsCompleted={stats.loadsCompleted}
          loadsTotal={stats.loadsTotal > 0 ? stats.loadsTotal : undefined}
        />
      </Animated.View>

      {/* Quick Actions Row */}
      <Animated.View entering={FadeInUp.delay(400)} style={styles.quickActions}>
        <QuickActionButton
          icon="truck"
          label="Trips"
          onPress={() => router.push('/(app)/trips')}
        />
        <QuickActionButton
          icon="clipboard-list"
          label="Docs"
          badge={expiredCount > 0 ? expiredCount : undefined}
          badgeVariant={expiredCount > 0 ? 'error' : 'warning'}
          onPress={() => router.push('/(app)/documents')}
        />
        <QuickActionButton
          icon="dollar"
          label="Earnings"
          onPress={() => router.push('/(app)/earnings')}
        />
      </Animated.View>

      {/* Document Alert - if expired */}
      {hasActiveTrip && expiredCount > 0 && (
        <Animated.View entering={FadeInUp.delay(500)}>
          <Pressable
            style={styles.alertCard}
            onPress={() => router.push('/(app)/documents')}
          >
            <View style={styles.alertContent}>
              <Icon name="alert-triangle" size="lg" color={colors.warning} />
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>
                  {expiredCount} Document{expiredCount > 1 ? 's' : ''} Expired
                </Text>
                <Text style={styles.alertSubtitle}>
                  {truck?.unit_number}
                  {trailer ? ` + ${trailer.unit_number}` : ''} - Tap to view
                </Text>
              </View>
              <Icon name="chevron-right" size="md" color={colors.textMuted} />
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* Upcoming Section (Collapsible) */}
      {upcomingTrips.length > 0 && (
        <Animated.View entering={FadeInUp.delay(600)} style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => setShowUpcoming(!showUpcoming)}
          >
            <Text style={styles.sectionTitle}>
              Upcoming ({upcomingTrips.length})
            </Text>
            <Text style={styles.collapseIcon}>
              {showUpcoming ? '▼' : '▶'}
            </Text>
          </Pressable>

          {showUpcoming && (
            <View style={styles.upcomingList}>
              {upcomingTrips.slice(0, 3).map((trip) => (
                <SwipeableActionCard
                  key={trip.id}
                  onSwipeRight={() => navigateToTrip(trip)}
                  onPress={() => navigateToTrip(trip)}
                  rightActionLabel="Open"
                  rightActionIcon="→"
                  rightActionColor={colors.primary}
                >
                  <UpcomingTripCard trip={trip} />
                </SwipeableActionCard>
              ))}
            </View>
          )}
        </Animated.View>
      )}

      {/* More Actions Hint */}
      {pendingActions.length > 1 && (
        <Animated.View entering={FadeInUp.delay(700)} style={styles.moreActions}>
          <Text style={styles.moreActionsText}>
            {pendingActions.length - 1} more action
            {pendingActions.length > 2 ? 's' : ''} pending
          </Text>
        </Animated.View>
      )}

      {/* Empty State */}
      {!loading && upcomingTrips.length === 0 && nextAction.type === 'no_action' && (
        <Animated.View entering={FadeInUp.delay(500)} style={styles.emptyState}>
          <Icon name="truck" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Active Trips</Text>
          <Text style={styles.emptySubtitle}>
            New assignments will appear here automatically
          </Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}

// === Sub-components ===

interface QuickActionButtonProps {
  icon: IconName;
  label: string;
  badge?: number;
  badgeVariant?: 'error' | 'warning';
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function QuickActionButton({
  icon,
  label,
  badge,
  badgeVariant,
  onPress,
}: QuickActionButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, []);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.quickActionButton, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <View style={styles.quickActionIconContainer}>
        <Icon name={icon} size="lg" color={colors.textPrimary} />
        {badge !== undefined && (
          <View
            style={[
              styles.quickActionBadge,
              badgeVariant === 'error'
                ? styles.badgeError
                : styles.badgeWarning,
            ]}
          >
            <Text style={styles.quickActionBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

interface UpcomingTripCardProps {
  trip: TripWithLoads;
}

function UpcomingTripCard({ trip }: UpcomingTripCardProps) {
  const route = `${trip.origin_city || '?'}, ${trip.origin_state || ''} → ${trip.destination_city || '?'}, ${trip.destination_state || ''}`;
  const loadCount = trip.trip_loads?.length || 0;
  const dateStr = trip.start_date
    ? new Date(trip.start_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'TBD';

  return (
    <View style={styles.upcomingCard}>
      <View style={styles.upcomingCardLeft}>
        <Text style={styles.upcomingTripNumber}>Trip #{trip.trip_number}</Text>
        <Text style={styles.upcomingRoute} numberOfLines={1}>
          {route}
        </Text>
      </View>
      <View style={styles.upcomingCardRight}>
        <Text style={styles.upcomingDate}>{dateStr}</Text>
        <Text style={styles.upcomingLoads}>
          {loadCount} load{loadCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

// === Helpers ===

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// === Styles ===

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.body,
    color: colors.textSecondary,
  },
  driverName: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.xxs,
  },
  signOutButton: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  signOutText: {
    ...typography.caption,
    color: colors.error,
  },
  errorCard: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  quickActionIconContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeError: {
    backgroundColor: colors.error,
  },
  badgeWarning: {
    backgroundColor: colors.warning,
  },
  quickActionBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  alertCard: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    ...typography.subheadline,
    color: colors.error,
  },
  alertSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  alertArrow: {
    color: colors.error,
    fontSize: 18,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  collapseIcon: {
    color: colors.textMuted,
    fontSize: 12,
  },
  upcomingList: {},
  upcomingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  upcomingCardLeft: {
    flex: 1,
  },
  upcomingCardRight: {
    alignItems: 'flex-end',
  },
  upcomingTripNumber: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  upcomingRoute: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  upcomingDate: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  upcomingLoads: {
    ...typography.caption,
    color: colors.textMuted,
  },
  moreActions: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  moreActionsText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
