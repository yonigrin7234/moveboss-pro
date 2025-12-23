/**
 * Load Board Screen - Browse marketplace loads from other companies
 * Find and request available loads to haul
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoadBoard, LoadBoardLoad, LoadBoardFilters } from '../../../hooks/useLoadBoard';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';

type TabType = 'all' | 'pickups' | 'loads';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

function timeAgo(dateString: string | null): string {
  if (!dateString) return '';
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

function LoadCard({ load, onPress }: { load: LoadBoardLoad; onPress: () => void }) {
  const formatDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPostingTypeLabel = () => {
    if (load.posting_type === 'pickup') return 'PICKUP';
    if (load.load_subtype === 'live') return 'LIVE LOAD';
    if (load.load_subtype === 'rfd') return 'RFD';
    return 'LOAD';
  };

  const getPostingTypeColor = () => {
    if (load.posting_type === 'pickup') return colors.warning;
    if (load.load_subtype === 'live') return colors.success;
    return colors.primary;
  };

  const hasRequested = !!load.my_request_status;
  const requestStatusColor = load.my_request_status === 'pending'
    ? colors.warning
    : load.my_request_status === 'accepted'
      ? colors.success
      : load.my_request_status === 'declined'
        ? colors.error
        : colors.textMuted;

  // Format rate display
  const getRateDisplay = () => {
    if (load.rate_per_cuft) {
      return `$${load.rate_per_cuft.toFixed(2)}/CF`;
    }
    if (load.company_rate) {
      return `$${load.company_rate.toLocaleString()}`;
    }
    return 'Make offer';
  };

  return (
    <Pressable
      style={styles.loadCard}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
    >
      {/* Header - Type Badge + Request Status */}
      <View style={styles.loadHeader}>
        <View style={[styles.typeBadge, { backgroundColor: getPostingTypeColor() + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: getPostingTypeColor() }]}>
            {getPostingTypeLabel()}
          </Text>
        </View>
        {load.is_ready_now && (
          <View style={[styles.typeBadge, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.typeBadgeText, { color: colors.success }]}>READY NOW</Text>
          </View>
        )}
        {hasRequested && (
          <View style={[styles.requestBadge, { backgroundColor: requestStatusColor + '20' }]}>
            <Text style={[styles.requestBadgeText, { color: requestStatusColor }]}>
              {load.my_request_status?.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Route with ZIP codes */}
      <View style={styles.routeContainer}>
        <View style={styles.locationColumn}>
          <Text style={styles.cityText} numberOfLines={1}>
            {load.origin_city}, {load.origin_state}
          </Text>
          <Text style={styles.zipText}>{load.origin_zip}</Text>
        </View>
        <View style={styles.arrowContainer}>
          <Icon name="arrow-right" size="sm" color={colors.textMuted} />
        </View>
        <View style={[styles.locationColumn, styles.destinationColumn]}>
          <Text style={styles.cityText} numberOfLines={1}>
            {load.destination_city}, {load.destination_state}
          </Text>
          <Text style={styles.zipText}>{load.destination_zip}</Text>
        </View>
      </View>

      {/* Size with rate per CF */}
      <View style={styles.detailsRow}>
        {load.estimated_cuft && (
          <View style={styles.detailItem}>
            <Icon name="box" size="xs" color={colors.textMuted} />
            <Text style={styles.detailText}>
              {load.estimated_cuft.toLocaleString()} CF
              {load.rate_per_cuft ? ` @ $${load.rate_per_cuft.toFixed(2)}/CF` : ''}
            </Text>
          </View>
        )}
        {load.rfd_date && (
          <View style={styles.detailItem}>
            <Icon name="calendar" size="xs" color={colors.textMuted} />
            <Text style={styles.detailText}>RFD {formatDate(load.rfd_date)}</Text>
          </View>
        )}
        {load.pickup_date_start && (
          <View style={styles.detailItem}>
            <Icon name="clock" size="xs" color={colors.textMuted} />
            <Text style={styles.detailText}>
              Pickup {formatDate(load.pickup_date_start)}
              {load.pickup_date_end && load.pickup_date_end !== load.pickup_date_start
                ? `-${formatDate(load.pickup_date_end)}`
                : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Badges Row - Truck Requirements, Urgency, Open to Offers */}
      <View style={styles.badgesRow}>
        {load.truck_requirement === 'semi_only' && (
          <View style={[styles.badge, { backgroundColor: '#6366F1' + '20' }]}>
            <Text style={[styles.badgeText, { color: '#6366F1' }]}>🚛 Semi Only</Text>
          </View>
        )}
        {load.truck_requirement === 'box_truck_only' && (
          <View style={[styles.badge, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.warning }]}>📦 Box Truck Only</Text>
          </View>
        )}
        {load.delivery_urgency === 'expedited' && (
          <View style={[styles.badge, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.error }]}>Expedited</Text>
          </View>
        )}
        {load.delivery_urgency === 'flexible' && (
          <View style={[styles.badge, { backgroundColor: colors.info + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.info }]}>Flexible</Text>
          </View>
        )}
        {load.is_open_to_counter && (
          <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>Open to offers</Text>
          </View>
        )}
      </View>

      {/* Footer - Company Info & Rate */}
      <View style={styles.loadFooter}>
        <View style={styles.companyInfo}>
          <Icon name="building" size="xs" color={colors.textMuted} />
          <Text style={styles.companyText} numberOfLines={1}>
            {load.company?.name || 'Company'}
          </Text>
          {load.company?.platform_rating && (
            <View style={styles.ratingBadge}>
              <Icon name="star" size="xs" color={colors.warning} />
              <Text style={styles.ratingText}>{load.company.platform_rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={styles.rateColumn}>
          <Text style={styles.rateText}>{getRateDisplay()}</Text>
          <Text style={styles.postedText}>{timeAgo(load.posted_to_marketplace_at)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function LoadBoardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [originFilter, setOriginFilter] = useState<string | undefined>();
  const [destFilter, setDestFilter] = useState<string | undefined>();

  // Build filters based on tab and state selections
  const filters: LoadBoardFilters = {
    posting_type: tab === 'all' ? undefined : tab === 'pickups' ? 'pickup' : 'load',
    origin_state: originFilter,
    destination_state: destFilter,
  };

  const { loads, isLoading, refetch } = useLoadBoard(filters);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLoadPress = (load: LoadBoardLoad) => {
    router.push(`/(owner)/load-board/${load.id}`);
  };

  const clearFilters = () => {
    setOriginFilter(undefined);
    setDestFilter(undefined);
    setShowFilters(false);
  };

  const hasFilters = !!originFilter || !!destFilter;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-left" size="md" color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Load Board</Text>
        <Pressable
          style={[styles.filterButton, hasFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon
            name="filter"
            size="md"
            color={hasFilters ? colors.primary : colors.textPrimary}
          />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>All</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'pickups' && styles.tabActive]}
          onPress={() => setTab('pickups')}
        >
          <Text style={[styles.tabText, tab === 'pickups' && styles.tabTextActive]}>Pickups</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'loads' && styles.tabActive]}
          onPress={() => setTab('loads')}
        >
          <Text style={[styles.tabText, tab === 'loads' && styles.tabTextActive]}>Loads</Text>
        </Pressable>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Origin</Text>
            <View style={styles.stateChips}>
              {originFilter ? (
                <Pressable
                  style={styles.selectedStateChip}
                  onPress={() => setOriginFilter(undefined)}
                >
                  <Text style={styles.selectedStateChipText}>{originFilter}</Text>
                  <Icon name="x" size="xs" color={colors.white} />
                </Pressable>
              ) : (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={US_STATES}
                  keyExtractor={(item) => `origin-${item}`}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.stateChip}
                      onPress={() => setOriginFilter(item)}
                    >
                      <Text style={styles.stateChipText}>{item}</Text>
                    </Pressable>
                  )}
                />
              )}
            </View>
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Destination</Text>
            <View style={styles.stateChips}>
              {destFilter ? (
                <Pressable
                  style={styles.selectedStateChip}
                  onPress={() => setDestFilter(undefined)}
                >
                  <Text style={styles.selectedStateChipText}>{destFilter}</Text>
                  <Icon name="x" size="xs" color={colors.white} />
                </Pressable>
              ) : (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={US_STATES}
                  keyExtractor={(item) => `dest-${item}`}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.stateChip}
                      onPress={() => setDestFilter(item)}
                    >
                      <Text style={styles.stateChipText}>{item}</Text>
                    </Pressable>
                  )}
                />
              )}
            </View>
          </View>
          {hasFilters && (
            <Pressable style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Load Count */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {loads.length} {loads.length === 1 ? 'load' : 'loads'} available
        </Text>
      </View>

      {/* Loads List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="inbox" size="xl" color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Loads Available</Text>
          <Text style={styles.emptyText}>
            {hasFilters
              ? 'Try adjusting your filters to see more loads'
              : 'Check back later for new marketplace loads'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={loads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LoadCard load={item} onPress={() => handleLoadPress(item)} />
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
  title: {
    flex: 1,
    ...typography.title,
    color: colors.textPrimary,
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    gap: spacing.sm,
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
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.white,
  },
  filtersPanel: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  filterRow: {
    marginBottom: spacing.sm,
  },
  filterLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  stateChips: {
    flexDirection: 'row',
  },
  stateChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    marginRight: spacing.xs,
  },
  stateChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  selectedStateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  selectedStateChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.white,
  },
  clearFiltersButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  clearFiltersText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  countBar: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
  },
  countText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxxl + 80,
  },
  loadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  loadHeader: {
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
  },
  requestBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  requestBadgeText: {
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
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  loadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  companyText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  rateColumn: {
    alignItems: 'flex-end',
  },
  rateText: {
    ...typography.headline,
    color: colors.success,
  },
  postedText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
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
  },
});
