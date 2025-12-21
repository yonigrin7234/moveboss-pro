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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../providers/AuthProvider';
import { useDriverProfile } from '../../hooks/useDriverProfile';
import { useDriverDashboard } from '../../hooks/useDriverDashboard';
import { useVehicleDocuments } from '../../hooks/useVehicleDocuments';
import { useTotalUnreadCount } from '../../hooks/useMessaging';
import {
  NextActionCard,
  QuickStats,
  SwipeableActionCard,
  Icon,
  NextActionSkeleton,
  SkeletonStats,
  ErrorState,
} from '../../components/ui';
import { QuickActionButton, UpcomingTripCard, DocumentAlertCard } from '../../components/dashboard';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { TripWithLoads } from '../../types';
import { dataLogger } from '../../lib/logger';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
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
    isRefreshing,
  } = useDriverDashboard();

  const showSkeleton = loading && !isRefreshing && nextAction.type === 'no_action' && upcomingTrips.length === 0;
  const { hasActiveTrip, truck, trailer, expiredCount } = useVehicleDocuments();
  const unreadMessageCount = useTotalUnreadCount();
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
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
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
      </View>

      {/* Error State */}
      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorState title="Unable to load dashboard" message={error} actionLabel="Retry" onAction={handleRefresh} />
        </View>
      )}

      {/* THE ONE ACTION */}
      {showSkeleton || (nextAction.type === 'start_trip' && (!nextAction.trip?.id || !nextAction.route)) ? (
        <NextActionSkeleton style={{ marginBottom: spacing.lg }} />
      ) : (
        <>
          <NextActionCard action={nextAction} />
        </>
      )}

      {/* Quick Stats Row */}
      {showSkeleton ? (
        <SkeletonStats style={{ marginBottom: spacing.lg }} />
      ) : (
        <QuickStats
          earnings={stats.todayEarnings}
          miles={stats.todayMiles}
          loadsCompleted={stats.loadsCompleted}
          loadsTotal={stats.loadsTotal > 0 ? stats.loadsTotal : undefined}
        />
      )}

      {/* Quick Actions Row */}
      <View style={styles.quickActions}>
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
          icon="message-square"
          label="Chat"
          badge={unreadMessageCount > 0 ? unreadMessageCount : undefined}
          badgeVariant={unreadMessageCount > 0 ? 'error' : undefined}
          onPress={() => router.push('/(app)/dispatch')}
        />
        <QuickActionButton
          icon="dollar"
          label="Pay"
          onPress={() => router.push('/(app)/earnings')}
        />
      </View>

      {/* Document Alert */}
      {hasActiveTrip && expiredCount > 0 && (
        <DocumentAlertCard
          expiredCount={expiredCount}
          truckUnitNumber={truck?.unit_number}
          trailerUnitNumber={trailer?.unit_number}
          onPress={() => router.push('/(app)/documents')}
        />
      )}

      {/* Upcoming Section */}
      {upcomingTrips.length > 0 && (
        <View style={styles.section}>
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
        </View>
      )}

      {/* More Actions Hint */}
      {pendingActions.length > 1 && (
        <View style={styles.moreActions}>
          <Text style={styles.moreActionsText}>
            {pendingActions.length - 1} more action
            {pendingActions.length > 2 ? 's' : ''} pending
          </Text>
        </View>
      )}

      {/* Empty State */}
      {!loading && !error && upcomingTrips.length === 0 && nextAction.type === 'no_action' && (
        <View style={styles.emptyState}>
          <Icon name="truck" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Active Trips</Text>
          <Text style={styles.emptySubtitle}>
            New assignments will appear here automatically
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

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
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
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
