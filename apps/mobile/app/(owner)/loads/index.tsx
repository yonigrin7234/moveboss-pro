/**
 * Loads Screen - View and manage all loads
 * Filter by status, RFD urgency, assignment
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useOwner } from '../../../providers/OwnerProvider';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';
import { ShareLoadSheet } from '../../../components/sharing/ShareLoadSheet';
import { MarketplaceActionSheet } from '../../../components/marketplace/MarketplaceActionSheet';
import { AssignToTripSheet } from '../../../components/trips/AssignToTripSheet';
import { BottomSheetRef } from '../../../components/ui/BottomSheet';
import { ShareableLoad } from '../../../lib/sharing';
import { haptics } from '../../../lib/haptics';

type FilterType = 'all' | 'pending' | 'assigned' | 'in_transit' | 'critical';

interface LoadData {
  id: string;
  load_number: string;
  pickup_city: string | null;
  pickup_state: string | null;
  pickup_postal_code: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_postal_code: string | null;
  cubic_feet: number | null;
  rate_per_cuft: number | null;
  total_rate: number | null;
  status: string;
  rfd_date: string | null;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  created_at: string;
  posting_status: string | null;
  is_marketplace_visible: boolean | null;
}

export default function LoadsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { company } = useOwner();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedLoad, setSelectedLoad] = useState<ShareableLoad | null>(null);
  const [marketplaceLoad, setMarketplaceLoad] = useState<LoadData | null>(null);
  const [assignLoad, setAssignLoad] = useState<LoadData | null>(null);
  const shareSheetRef = useRef<BottomSheetRef>(null);
  const marketplaceSheetRef = useRef<BottomSheetRef>(null);
  const assignSheetRef = useRef<BottomSheetRef>(null);

  const { data: loads, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['loads', company?.id, filter],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('loads')
        .select(`
          id,
          load_number,
          pickup_city,
          pickup_state,
          pickup_postal_code,
          delivery_city,
          delivery_state,
          delivery_postal_code,
          cubic_feet,
          rate_per_cuft,
          total_rate,
          status,
          rfd_date,
          pickup_window_start,
          pickup_window_end,
          created_at,
          posting_status,
          is_marketplace_visible
        `)
        .eq('posted_by_company_id', company.id)
        .order('created_at', { ascending: false });

      if (filter === 'critical') {
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        query = query
          .in('status', ['pending', 'assigned', 'in_transit'])
          .not('rfd_date', 'is', null)
          .lte('rfd_date', twoDaysFromNow.toISOString().split('T')[0]);
      } else if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Error fetching loads:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!company?.id,
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'critical', label: 'Critical RFD' },
  ];

  const handleMarketplace = (load: LoadData) => {
    haptics.selection();
    setMarketplaceLoad(load);
    marketplaceSheetRef.current?.open();
  };

  const handleShare = (load: LoadData) => {
    haptics.selection();
    // Convert to ShareableLoad format with all required fields
    const shareableLoad: ShareableLoad = {
      id: load.id,
      load_number: load.load_number,
      pickup_city: load.pickup_city,
      pickup_state: load.pickup_state,
      pickup_postal_code: load.pickup_postal_code,
      delivery_city: load.delivery_city,
      delivery_state: load.delivery_state,
      delivery_postal_code: load.delivery_postal_code,
      cubic_feet: load.cubic_feet,
      rate_per_cuft: load.rate_per_cuft,
      total_rate: load.total_rate,
      rfd_date: load.rfd_date,
      pickup_window_start: load.pickup_window_start,
      pickup_window_end: load.pickup_window_end,
      status: load.status,
    };
    setSelectedLoad(shareableLoad);
    shareSheetRef.current?.open();
  };

  const handleAssignToTrip = (load: LoadData) => {
    haptics.selection();
    setAssignLoad(load);
    assignSheetRef.current?.open();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Loads</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/(owner)/loads/new')}
          >
            <Icon name="plus" size="md" color={colors.white} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {loads?.map((load) => {
          const daysUntilRfd = load.rfd_date
            ? Math.ceil((new Date(load.rfd_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <Pressable
              key={load.id}
              style={styles.loadCard}
              onPress={() => router.push(`/(owner)/loads/${load.id}`)}
            >
              <View style={styles.loadHeader}>
                <Text style={styles.loadNumber}>{load.load_number}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(load.status) + '20' },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(load.status) },
                  ]}>
                    {formatStatus(load.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.routeRow}>
                <Icon name="map-pin" size="sm" color={colors.textMuted} />
                <Text style={styles.routeText}>
                  {load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailText}>{load.cubic_feet} CF</Text>
                {load.rate_per_cuft && (
                  <Text style={styles.detailText}>${load.rate_per_cuft}/cf</Text>
                )}
                {daysUntilRfd !== null && (
                  <View style={[
                    styles.rfdBadge,
                    daysUntilRfd <= 0 && styles.rfdBadgeOverdue,
                  ]}>
                    <Text style={[
                      styles.rfdText,
                      daysUntilRfd <= 0 && styles.rfdTextOverdue,
                    ]}>
                      RFD: {daysUntilRfd <= 0 ? 'Overdue' : `${daysUntilRfd}d`}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <Pressable
                  style={styles.actionIconButton}
                  onPressIn={(e) => e.stopPropagation()}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAssignToTrip(load);
                  }}
                  delayPressIn={0}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Icon name="truck" size="sm" color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  style={[
                    styles.actionIconButton,
                    load.posting_status === 'posted' && styles.actionIconButtonActive,
                  ]}
                  onPressIn={(e) => e.stopPropagation()}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleMarketplace(load);
                  }}
                  delayPressIn={0}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Icon
                    name="upload"
                    size="sm"
                    color={load.posting_status === 'posted' ? colors.success : colors.textSecondary}
                  />
                </Pressable>
                <Pressable
                  style={styles.actionIconButton}
                  onPressIn={(e) => e.stopPropagation()}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleShare(load);
                  }}
                  delayPressIn={0}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Icon name="share" size="sm" color={colors.textSecondary} />
                </Pressable>
              </View>
            </Pressable>
          );
        })}

        {!isLoading && (!loads || loads.length === 0) && (
          <View style={styles.emptyState}>
            <Icon name="package" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Loads Found</Text>
            <Text style={styles.emptySubtitle}>
              {filter !== 'all' ? 'Try a different filter' : 'Create your first load'}
            </Text>
          </View>
        )}
      </ScrollView>

      <ShareLoadSheet
        ref={shareSheetRef}
        load={selectedLoad}
        companyName={company?.name || undefined}
        onClose={() => setSelectedLoad(null)}
      />

      <MarketplaceActionSheet
        ref={marketplaceSheetRef}
        loadId={marketplaceLoad?.id || null}
        isCurrentlyPosted={marketplaceLoad?.posting_status === 'posted'}
        loadNumber={marketplaceLoad?.load_number}
        onClose={() => setMarketplaceLoad(null)}
        onSuccess={() => refetch()}
      />

      <AssignToTripSheet
        ref={assignSheetRef}
        loadId={assignLoad?.id || null}
        loadNumber={assignLoad?.load_number}
        onClose={() => setAssignLoad(null)}
        onSuccess={() => refetch()}
      />
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return colors.warning;
    case 'assigned': return colors.info;
    case 'in_transit': return colors.primary;
    case 'delivered': return colors.success;
    case 'cancelled': return colors.error;
    default: return colors.textMuted;
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    marginHorizontal: -spacing.screenPadding,
  },
  filterContent: {
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.screenPadding,
    paddingTop: 0,
    paddingBottom: spacing.xxxl + 80,
  },
  loadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  loadNumber: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  routeText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rfdBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  rfdBadgeOverdue: {
    backgroundColor: colors.errorSoft,
  },
  rfdText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.warning,
  },
  rfdTextOverdue: {
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  actionIconButtonActive: {
    backgroundColor: colors.successSoft,
  },
});
