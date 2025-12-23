/**
 * My Requests Screen - Track outgoing load requests
 * Shows all loads the carrier has requested from the marketplace
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyRequests, useWithdrawMyRequest, MyRequest } from '../../../hooks/useMyRequests';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';

type TabType = 'pending' | 'accepted' | 'declined' | 'all';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: colors.warning, icon: 'clock' as const },
  accepted: { label: 'Accepted', color: colors.success, icon: 'check-circle' as const },
  declined: { label: 'Declined', color: colors.error, icon: 'x-circle' as const },
  withdrawn: { label: 'Withdrawn', color: colors.textMuted, icon: 'x-circle' as const },
  expired: { label: 'Expired', color: colors.textMuted, icon: 'clock' as const },
};

function timeAgo(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RequestCard({
  request,
  onPress,
  onWithdraw,
  isWithdrawing,
}: {
  request: MyRequest;
  onPress: () => void;
  onWithdraw?: () => void;
  isWithdrawing?: boolean;
}) {
  const status = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const load = request.load;
  const isPending = request.status === 'pending';

  // Determine offer display
  const getOfferDisplay = () => {
    if (request.request_type === 'counter_offer' && request.counter_offer_rate) {
      return `$${request.counter_offer_rate.toFixed(2)}/CF (counter)`;
    }
    if (request.accepted_company_rate || request.request_type === 'accept_listed') {
      return load.rate_per_cuft
        ? `$${load.rate_per_cuft.toFixed(2)}/CF`
        : 'Accepted rate';
    }
    return 'Accepted rate';
  };

  const getPostingTypeLabel = () => {
    if (load.posting_type === 'pickup') return 'PICKUP';
    if (load.load_subtype === 'live') return 'LIVE';
    if (load.load_subtype === 'rfd') return 'RFD';
    return 'LOAD';
  };

  return (
    <Pressable
      style={styles.requestCard}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
            {getPostingTypeLabel()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Icon name={status.icon} size="xs" color={status.color} />
          <Text style={[styles.statusBadgeText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeContainer}>
        <View style={styles.locationColumn}>
          <Text style={styles.cityText} numberOfLines={1}>
            {load.pickup_city}, {load.pickup_state}
          </Text>
          <Text style={styles.zipText}>{load.pickup_zip}</Text>
        </View>
        <View style={styles.arrowContainer}>
          <Icon name="arrow-right" size="sm" color={colors.textMuted} />
        </View>
        <View style={[styles.locationColumn, styles.destinationColumn]}>
          <Text style={styles.cityText} numberOfLines={1}>
            {load.delivery_city}, {load.delivery_state}
          </Text>
          <Text style={styles.zipText}>{load.delivery_zip}</Text>
        </View>
      </View>

      {/* Details Row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Icon name="building" size="xs" color={colors.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>
            {request.company?.name || 'Company'}
          </Text>
        </View>
        {load.cubic_feet_estimate && (
          <View style={styles.detailItem}>
            <Icon name="box" size="xs" color={colors.textMuted} />
            <Text style={styles.detailText}>
              {load.cubic_feet_estimate.toLocaleString()} CF
            </Text>
          </View>
        )}
        <Text style={styles.loadNumber}>#{load.load_number}</Text>
      </View>

      {/* Rates */}
      <View style={styles.ratesRow}>
        {load.rate_per_cuft && (
          <Text style={styles.postedRate}>
            Posted: ${load.rate_per_cuft.toFixed(2)}/CF
          </Text>
        )}
        <View style={styles.yourOfferContainer}>
          <Icon name="dollar" size="xs" color={colors.primary} />
          <Text style={styles.yourOfferText}>
            Your offer: <Text style={styles.yourOfferValue}>{getOfferDisplay()}</Text>
          </Text>
        </View>
      </View>

      {/* Proposed Dates */}
      {(request.proposed_load_date_start || request.proposed_delivery_date_start) && (
        <View style={styles.datesRow}>
          {request.proposed_load_date_start && (
            <View style={styles.dateItem}>
              <Icon name="calendar" size="xs" color={colors.textMuted} />
              <Text style={styles.dateText}>
                Load: {formatDate(request.proposed_load_date_start)}
                {request.proposed_load_date_end && request.proposed_load_date_end !== request.proposed_load_date_start
                  ? ` - ${formatDate(request.proposed_load_date_end)}`
                  : ''}
              </Text>
            </View>
          )}
          {request.proposed_delivery_date_start && (
            <View style={styles.dateItem}>
              <Icon name="calendar" size="xs" color={colors.textMuted} />
              <Text style={styles.dateText}>
                Deliver: {formatDate(request.proposed_delivery_date_start)}
                {request.proposed_delivery_date_end && request.proposed_delivery_date_end !== request.proposed_delivery_date_start
                  ? ` - ${formatDate(request.proposed_delivery_date_end)}`
                  : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.timeAgo}>Requested {timeAgo(request.created_at)}</Text>
        {isPending && onWithdraw && (
          <Pressable
            style={styles.withdrawButton}
            onPress={(e) => {
              e.stopPropagation();
              haptics.tap();
              onWithdraw();
            }}
            disabled={isWithdrawing}
          >
            {isWithdrawing ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Icon name="x" size="xs" color={colors.error} />
                <Text style={styles.withdrawText}>Cancel</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export default function MyRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('pending');

  const {
    requests: allRequests,
    pendingRequests,
    acceptedRequests,
    declinedRequests,
    isLoading,
    refetch,
  } = useMyRequests();

  const { withdrawRequest, isWithdrawing } = useWithdrawMyRequest();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleWithdraw = (request: MyRequest) => {
    Alert.alert(
      'Cancel Request',
      `Are you sure you want to cancel your request for load #${request.load.load_number}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setWithdrawingId(request.id);
            try {
              await withdrawRequest({ requestId: request.id });
              haptics.success();
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel request');
            } finally {
              setWithdrawingId(null);
            }
          },
        },
      ]
    );
  };

  const handleRequestPress = (request: MyRequest) => {
    // For accepted requests, go to assigned loads; otherwise go to load board detail
    if (request.status === 'accepted') {
      router.push(`/(owner)/loads/${request.load.id}`);
    } else {
      router.push(`/(owner)/load-board/${request.load.id}`);
    }
  };

  // Get filtered list based on tab
  const getFilteredRequests = (): MyRequest[] => {
    switch (tab) {
      case 'pending':
        return pendingRequests;
      case 'accepted':
        return acceptedRequests;
      case 'declined':
        return declinedRequests;
      case 'all':
        return allRequests;
    }
  };

  const filteredRequests = getFilteredRequests();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-left" size="md" color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>My Requests</Text>
          <Text style={styles.subtitle}>Track your load requests</Text>
        </View>
        <Pressable
          style={styles.browseButton}
          onPress={() => router.push('/(owner)/load-board')}
        >
          <Icon name="search" size="md" color={colors.primary} />
        </Pressable>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.warningSoft }]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {pendingRequests.length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.successSoft }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {acceptedRequests.length}
          </Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.textMuted }]}>
            {declinedRequests.length}
          </Text>
          <Text style={styles.statLabel}>Other</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, tab === 'pending' && styles.tabActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingRequests.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'accepted' && styles.tabActive]}
          onPress={() => setTab('accepted')}
        >
          <Text style={[styles.tabText, tab === 'accepted' && styles.tabTextActive]}>
            Accepted ({acceptedRequests.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'declined' && styles.tabActive]}
          onPress={() => setTab('declined')}
        >
          <Text style={[styles.tabText, tab === 'declined' && styles.tabTextActive]}>
            Other
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </Pressable>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name={tab === 'pending' ? 'clock' : tab === 'accepted' ? 'check-circle' : 'inbox'}
            size="xl"
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>
            {tab === 'pending'
              ? 'No Pending Requests'
              : tab === 'accepted'
                ? 'No Accepted Requests'
                : tab === 'declined'
                  ? 'No Declined Requests'
                  : 'No Requests Yet'}
          </Text>
          <Text style={styles.emptyText}>
            {tab === 'pending' || tab === 'all'
              ? 'Browse the load board to find available loads'
              : 'Your requests will appear here'}
          </Text>
          {(tab === 'pending' || tab === 'all') && (
            <Pressable
              style={styles.browseLoadsButton}
              onPress={() => router.push('/(owner)/load-board')}
            >
              <Icon name="search" size="sm" color={colors.white} />
              <Text style={styles.browseLoadsButtonText}>Browse Load Board</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              onPress={() => handleRequestPress(item)}
              onWithdraw={item.status === 'pending' ? () => handleWithdraw(item) : undefined}
              isWithdrawing={withdrawingId === item.id}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  browseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statValue: {
    ...typography.headline,
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxxl + 80,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    marginLeft: 'auto',
  },
  statusBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationColumn: {
    flex: 1,
  },
  destinationColumn: {
    alignItems: 'flex-end',
  },
  cityText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  zipText: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  arrowContainer: {
    paddingHorizontal: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flex: 1,
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  loadNumber: {
    ...typography.caption,
    color: colors.textMuted,
  },
  ratesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  postedRate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  yourOfferContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  yourOfferText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  yourOfferValue: {
    fontWeight: '600',
    color: colors.primary,
  },
  datesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeAgo: {
    ...typography.caption,
    color: colors.textMuted,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.errorSoft,
  },
  withdrawText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.error,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  browseLoadsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  browseLoadsButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
});
