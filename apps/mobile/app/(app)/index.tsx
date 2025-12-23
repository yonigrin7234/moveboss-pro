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
import { useDriverProfile } from '../../hooks/useDriverProfile';
import { useDriverDashboard } from '../../hooks/useDriverDashboard';
import { useVehicleDocuments } from '../../hooks/useVehicleDocuments';
import { useTotalUnreadCount } from '../../hooks/useMessaging';
import { Logo } from '../../components/ui/Logo';
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
  const { hasActiveTrip, truck, trailer, expiredCount, company } = useVehicleDocuments();
  const unreadMessageCount = useTotalUnreadCount();
  const router = useRouter();
  const [showUpcoming, setShowUpcoming] = useState(true);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
  }, [refetch]);

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
      {/* Header with Logo */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo size={36} />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.greeting}>
              {getGreeting()}
              {fullName ? `, ${fullName}` : ''}
            </Text>
            {company?.name && (
              <Text style={styles.companyName}>{company.name}</Text>
            )}
          </View>
        </View>
        <Pressable
          style={styles.settingsButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(app)/settings');
          }}
        >
          <Icon name="settings" size="md" color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Earnings Hero Card */}
      <View style={styles.earningsHeroCard}>
        <View style={styles.earningsHeroContent}>
          <Text style={styles.earningsHeroLabel}>This Week</Text>
          <Text style={styles.earningsHeroValue}>
            ${stats.todayEarnings > 0 ? stats.todayEarnings.toLocaleString() : '0'}
          </Text>
          <Text style={styles.earningsHeroSubtext}>
            {stats.loadsCompleted} load{stats.loadsCompleted !== 1 ? 's' : ''} completed
          </Text>
        </View>
        <Pressable
          style={styles.earningsHeroButton}
          onPress={() => router.push('/(app)/earnings')}
        >
          <Icon name="dollar" size={24} color={colors.primary} />
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
          badge={hasActiveTrip ? 1 : undefined}
          badgeVariant="warning"
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
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerTitleContainer: {
    flex: 1,
  },
  greeting: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  companyName: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  settingsButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Earnings Hero Card
  earningsHeroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    ...shadows.md,
  },
  earningsHeroContent: {
    flex: 1,
  },
  earningsHeroLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  earningsHeroValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: -1,
  },
  earningsHeroSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  earningsHeroButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
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
