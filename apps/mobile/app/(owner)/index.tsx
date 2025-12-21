/**
 * Owner Dashboard - Business Overview
 *
 * Shows critical business metrics and action items:
 * - Pending load requests requiring response
 * - Critical RFD dates approaching
 * - Active trips overview
 * - Quick actions for common tasks
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
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../providers/AuthProvider';
import { useOwner } from '../../providers/OwnerProvider';
import { useOwnerDashboardData } from '../../hooks/useOwnerDashboardData';
import { Icon, IconName } from '../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

export default function OwnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { company, role } = useOwner();
  const {
    stats,
    pendingRequests,
    criticalLoads,
    activeTrips,
    isLoading,
  } = useOwnerDashboardData();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    // React Query will handle the actual refetch
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSignOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signOut();
  }, [signOut]);

  const companyName = company?.dba_name || company?.name || 'Your Company';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.companyName}>{companyName}</Text>
          {role && (
            <Text style={styles.roleLabel}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          )}
        </View>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Critical Alerts */}
      {(stats.pendingRequests > 0 || stats.criticalRfd > 0) && (
        <View style={styles.alertsContainer}>
          {stats.pendingRequests > 0 && (
            <Pressable
              style={[styles.alertCard, styles.alertCardRequest]}
              onPress={() => router.push('/(owner)/requests')}
            >
              <View style={styles.alertIconContainer}>
                <Icon name="bell" size="lg" color={colors.white} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertCount}>{stats.pendingRequests}</Text>
                <Text style={styles.alertLabel}>
                  Load Request{stats.pendingRequests !== 1 ? 's' : ''}
                </Text>
              </View>
              <Icon name="chevron-right" size="md" color={colors.white} />
            </Pressable>
          )}

          {stats.criticalRfd > 0 && (
            <Pressable
              style={[styles.alertCard, styles.alertCardRfd]}
              onPress={() => router.push('/(owner)/loads')}
            >
              <View style={styles.alertIconContainer}>
                <Icon name="alert-triangle" size="lg" color={colors.white} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertCount}>{stats.criticalRfd}</Text>
                <Text style={styles.alertLabel}>Critical RFD</Text>
              </View>
              <Icon name="chevron-right" size="md" color={colors.white} />
            </Pressable>
          )}
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="truck"
          label="Active Trips"
          value={stats.activeTrips.toString()}
          onPress={() => router.push('/(owner)/trips')}
        />
        <StatCard
          icon="package"
          label="Delivered Today"
          value={stats.loadsDeliveredToday.toString()}
        />
        <StatCard
          icon="dollar"
          label="Today's Revenue"
          value={formatCurrency(stats.revenueToday)}
          highlight
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="plus"
            label="Add Load"
            onPress={() => router.push('/(owner)/loads/new')}
          />
          <QuickAction
            icon="map"
            label="Driver Map"
            onPress={() => router.push('/(owner)/drivers/map')}
          />
          <QuickAction
            icon="truck"
            label="New Trip"
            onPress={() => router.push('/(owner)/trips/new')}
          />
          <QuickAction
            icon="settings"
            label="Settings"
            onPress={() => router.push('/(owner)/settings')}
          />
        </View>
      </View>

      {/* Recent Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            <Pressable onPress={() => router.push('/(owner)/requests')}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>
          {pendingRequests.slice(0, 3).map((request) => (
            <Pressable
              key={request.id}
              style={styles.requestCard}
              onPress={() => router.push(`/(owner)/requests/${request.id}`)}
            >
              <View style={styles.requestInfo}>
                <Text style={styles.requestCarrier}>
                  {request.carrier?.dba_name || request.carrier?.name || 'Unknown Carrier'}
                </Text>
                <Text style={styles.requestLoad}>
                  {request.load?.origin_city}, {request.load?.origin_state} →{' '}
                  {request.load?.destination_city}, {request.load?.destination_state}
                </Text>
                <Text style={styles.requestDetails}>
                  {request.load?.cuft} CF • {formatAge(request.created_at)}
                </Text>
              </View>
              <Icon name="chevron-right" size="md" color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Critical RFD Loads */}
      {criticalLoads.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Critical RFD</Text>
            <Pressable onPress={() => router.push('/(owner)/loads')}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>
          {criticalLoads.slice(0, 3).map((load) => (
            <Pressable
              key={load.id}
              style={styles.loadCard}
              onPress={() => router.push(`/(owner)/loads/${load.id}`)}
            >
              <View style={styles.loadInfo}>
                <Text style={styles.loadNumber}>{load.load_number}</Text>
                <Text style={styles.loadRoute}>
                  {load.origin_city}, {load.origin_state} →{' '}
                  {load.destination_city}, {load.destination_state}
                </Text>
              </View>
              <View style={styles.rfdBadge}>
                <Text style={[
                  styles.rfdText,
                  load.days_until_rfd !== null && load.days_until_rfd <= 0 && styles.rfdOverdue,
                ]}>
                  {formatDaysUntilRfd(load.days_until_rfd)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Empty State */}
      {!isLoading && stats.pendingRequests === 0 && stats.criticalRfd === 0 && stats.activeTrips === 0 && (
        <View style={styles.emptyState}>
          <Icon name="check-circle" size={48} color={colors.success} />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            No pending requests or critical items
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// Helper Components

function StatCard({
  icon,
  label,
  value,
  highlight,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  highlight?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Icon
        name={icon}
        size="md"
        color={highlight ? colors.primary : colors.textMuted}
      />
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Icon name={icon} size="md" color={colors.primary} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

// Helper Functions

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

function formatAge(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDaysUntilRfd(days: number | null): string {
  if (days === null) return 'TBD';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days}d`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xxxl + 80, // Extra padding for tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.body,
    color: colors.textSecondary,
  },
  companyName: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.xxs,
  },
  roleLabel: {
    ...typography.caption,
    color: colors.primary,
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

  // Alerts
  alertsContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.md,
  },
  alertCardRequest: {
    backgroundColor: colors.error,
  },
  alertCardRfd: {
    backgroundColor: colors.warning,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertCount: {
    ...typography.title,
    color: colors.white,
  },
  alertLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  statCardHighlight: {
    backgroundColor: colors.primarySoft,
  },
  statValue: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statValueHighlight: {
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
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
  seeAllText: {
    ...typography.caption,
    color: colors.primary,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickAction: {
    width: '22%',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Request Cards
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  requestInfo: {
    flex: 1,
  },
  requestCarrier: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  requestLoad: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  requestDetails: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },

  // Load Cards
  loadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  loadInfo: {
    flex: 1,
  },
  loadNumber: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadRoute: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  rfdBadge: {
    backgroundColor: colors.errorSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  rfdText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.warning,
  },
  rfdOverdue: {
    color: colors.error,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
