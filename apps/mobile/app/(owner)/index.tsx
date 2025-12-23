/**
 * Owner Dashboard - Business Overview
 *
 * Restructured for optimal UX:
 * - Hero revenue card at top (owner's primary concern)
 * - Unified action required banner
 * - 4 metric pills for quick scanning
 * - 3 focused quick actions
 * - Unified activity feed combining requests & critical items
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
import { useOwner } from '../../providers/OwnerProvider';
import { useOwnerDashboardData } from '../../hooks/useOwnerDashboardData';
import { Icon, IconName } from '../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

export default function OwnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { company } = useOwner();
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
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const companyName = company?.name || 'Your Company';
  const totalActionItems = stats.pendingRequests + stats.criticalRfd;

  // Combine requests and critical loads into unified activity items
  const activityItems = [
    ...pendingRequests.slice(0, 3).map(req => ({
      id: req.id,
      type: 'request' as const,
      title: req.carrier?.name || 'Unknown Carrier',
      subtitle: `${req.load?.pickup_city}, ${req.load?.pickup_state} → ${req.load?.delivery_city}, ${req.load?.delivery_state}`,
      detail: `${req.load?.cubic_feet} CF`,
      timestamp: req.created_at,
      urgent: true,
      onPress: () => router.push(`/(owner)/requests/${req.id}`),
    })),
    ...criticalLoads.slice(0, 3).map(load => ({
      id: load.id,
      type: 'rfd' as const,
      title: load.load_number,
      subtitle: `${load.pickup_city}, ${load.pickup_state} → ${load.delivery_city}, ${load.delivery_state}`,
      detail: formatDaysUntilRfd(load.days_until_rfd),
      timestamp: load.rfd_date || '',
      urgent: load.days_until_rfd !== null && load.days_until_rfd <= 0,
      onPress: () => router.push(`/(owner)/loads/${load.id}`),
    })),
  ].sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1)).slice(0, 5);

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
      {/* Compact Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.companyName}>{companyName}</Text>
      </View>

      {/* Hero Revenue Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroContent}>
          <Text style={styles.heroLabel}>Today's Revenue</Text>
          <Text style={styles.heroValue}>{formatCurrency(stats.revenueToday)}</Text>
          <Text style={styles.heroSubtext}>
            {stats.loadsDeliveredToday} load{stats.loadsDeliveredToday !== 1 ? 's' : ''} delivered
          </Text>
        </View>
        <View style={styles.heroIcon}>
          <Icon name="dollar" size={32} color={colors.primary} />
        </View>
      </View>

      {/* Action Required Banner */}
      {totalActionItems > 0 && (
        <Pressable
          style={styles.actionBanner}
          onPress={() => router.push('/(owner)/requests')}
        >
          <View style={styles.actionBannerLeft}>
            <View style={styles.actionBannerIcon}>
              <Icon name="alert-circle" size="md" color={colors.white} />
            </View>
            <View>
              <Text style={styles.actionBannerTitle}>
                {totalActionItems} Action{totalActionItems !== 1 ? 's' : ''} Required
              </Text>
              <Text style={styles.actionBannerSubtitle}>
                {stats.pendingRequests > 0 && `${stats.pendingRequests} request${stats.pendingRequests !== 1 ? 's' : ''}`}
                {stats.pendingRequests > 0 && stats.criticalRfd > 0 && ' • '}
                {stats.criticalRfd > 0 && `${stats.criticalRfd} critical RFD`}
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size="md" color={colors.white} />
        </Pressable>
      )}

      {/* Metric Pills */}
      <View style={styles.metricsRow}>
        <MetricPill
          icon="truck"
          value={stats.activeTrips}
          label="Trips"
          onPress={() => router.push('/(owner)/trips')}
        />
        <MetricPill
          icon="users"
          value={activeTrips.length}
          label="Drivers"
          onPress={() => router.push('/(owner)/drivers/map')}
        />
        <MetricPill
          icon="package"
          value={stats.loadsDeliveredToday}
          label="Delivered"
        />
        <MetricPill
          icon="clock"
          value={pendingRequests.length}
          label="Pending"
          highlight={pendingRequests.length > 0}
          onPress={() => router.push('/(owner)/requests')}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="search"
            label="Find Loads"
            highlight
            onPress={() => router.push('/(owner)/load-board')}
          />
          <QuickAction
            icon="plus"
            label="Add Load"
            onPress={() => router.push('/(owner)/loads/new')}
          />
          <QuickAction
            icon="package"
            label="My Loads"
            onPress={() => router.push('/(owner)/loads')}
          />
          <QuickAction
            icon="map"
            label="Drivers"
            onPress={() => router.push('/(owner)/drivers/map')}
          />
        </View>
      </View>

      {/* Activity Feed */}
      {activityItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Needs Attention</Text>
            <Pressable onPress={() => router.push('/(owner)/requests')}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>
          {activityItems.map((item) => (
            <Pressable
              key={`${item.type}-${item.id}`}
              style={styles.activityCard}
              onPress={item.onPress}
            >
              <View style={[
                styles.activityIndicator,
                item.type === 'request' ? styles.indicatorRequest : styles.indicatorRfd,
                item.urgent && styles.indicatorUrgent,
              ]} />
              <View style={styles.activityContent}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[
                    styles.activityBadge,
                    item.type === 'request' ? styles.badgeRequest : styles.badgeRfd,
                  ]}>
                    <Text style={styles.activityBadgeText}>
                      {item.type === 'request' ? 'Request' : item.detail}
                    </Text>
                  </View>
                </View>
                <Text style={styles.activitySubtitle} numberOfLines={1}>{item.subtitle}</Text>
                {item.type === 'request' && (
                  <Text style={styles.activityDetail}>{item.detail} • {formatAge(item.timestamp)}</Text>
                )}
              </View>
              <Icon name="chevron-right" size="sm" color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Empty State */}
      {!isLoading && totalActionItems === 0 && stats.activeTrips === 0 && (
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

function MetricPill({
  icon,
  value,
  label,
  highlight,
  onPress,
}: {
  icon: IconName;
  value: number;
  label: string;
  highlight?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.metricPill, highlight && styles.metricPillHighlight]}>
      <Icon name={icon} size="sm" color={highlight ? colors.error : colors.textMuted} />
      <Text style={[styles.metricValue, highlight && styles.metricValueHighlight]}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress} style={styles.metricPillWrapper}>{content}</Pressable>;
  }
  return <View style={styles.metricPillWrapper}>{content}</View>;
}

function QuickAction({
  icon,
  label,
  highlight,
  onPress,
}: {
  icon: IconName;
  label: string;
  highlight?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, highlight && styles.quickActionIconHighlight]}>
        <Icon name={icon} size="md" color={highlight ? colors.white : colors.primary} />
      </View>
      <Text style={[styles.quickActionLabel, highlight && styles.quickActionLabelHighlight]}>
        {label}
      </Text>
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
  if (value >= 10000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  if (value >= 1000) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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
  if (days < 0) return `${Math.abs(days)}d late`;
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
    paddingBottom: spacing.xxxl + 80,
  },

  // Header
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.caption,
    color: colors.textMuted,
  },
  companyName: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.xxs,
  },

  // Hero Revenue Card
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    ...shadows.md,
  },
  heroContent: {
    flex: 1,
  },
  heroLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
  },
  heroSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action Banner
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.error,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  actionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionBannerTitle: {
    ...typography.headline,
    color: colors.white,
  },
  actionBannerSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xxs,
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  metricPillWrapper: {
    flex: 1,
  },
  metricPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  metricPillHighlight: {
    backgroundColor: colors.errorSoft,
  },
  metricValue: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  metricValueHighlight: {
    color: colors.error,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
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
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
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
  quickActionIconHighlight: {
    backgroundColor: colors.primary,
  },
  quickActionLabelHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Activity Feed
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  activityIndicator: {
    width: 4,
    height: '100%',
    minHeight: 48,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  indicatorRequest: {
    backgroundColor: colors.primary,
  },
  indicatorRfd: {
    backgroundColor: colors.warning,
  },
  indicatorUrgent: {
    backgroundColor: colors.error,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  activityTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  activityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  badgeRequest: {
    backgroundColor: colors.primarySoft,
  },
  badgeRfd: {
    backgroundColor: colors.warningSoft,
  },
  activityBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activitySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  activityDetail: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
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
