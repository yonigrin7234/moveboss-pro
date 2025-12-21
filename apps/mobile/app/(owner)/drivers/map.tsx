/**
 * Driver Map Screen - Real-time driver locations
 * Shows last known locations for all drivers with location sharing enabled
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';

type FilterType = 'all' | 'available' | 'on_trip';

interface DriverLocation {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string | null;
  location_sharing_enabled: boolean;
  // Latest trip location data
  current_trip?: {
    id: string;
    trip_number: string;
    current_location_lat: number | null;
    current_location_lng: number | null;
    current_location_city: string | null;
    current_location_state: string | null;
    current_location_updated_at: string | null;
    origin_city: string | null;
    origin_state: string | null;
    destination_city: string | null;
    destination_state: string | null;
  } | null;
}

export default function DriverMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch drivers with their current locations
  const { data: drivers, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['driver-locations'],
    queryFn: async (): Promise<DriverLocation[]> => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      // Get all drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          status,
          location_sharing_enabled
        `)
        .eq('owner_id', user.user.id)
        .order('first_name');

      if (driversError) {
        console.error('Error fetching drivers:', driversError);
        return [];
      }

      // For each driver with location sharing, get their active trip
      const driversWithLocations: DriverLocation[] = await Promise.all(
        (driversData || []).map(async (driver) => {
          let currentTrip = null;

          if (driver.status === 'on_trip' || driver.location_sharing_enabled) {
            // Get the driver's active trip with location
            const { data: tripData } = await supabase
              .from('trips')
              .select(`
                id,
                trip_number,
                current_location_lat,
                current_location_lng,
                current_location_city,
                current_location_state,
                current_location_updated_at,
                origin_city,
                origin_state,
                destination_city,
                destination_state
              `)
              .eq('driver_id', driver.id)
              .in('status', ['active', 'en_route'])
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (tripData) {
              currentTrip = tripData;
            }
          }

          return {
            ...driver,
            current_trip: currentTrip,
          };
        })
      );

      return driversWithLocations;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Set up real-time subscription for trip location updates
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const channel = supabase
        .channel('driver-location-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'trips',
            filter: `owner_id=eq.${user.user.id}`,
          },
          () => {
            // Refetch data when a trip is updated
            queryClient.invalidateQueries({ queryKey: ['driver-locations'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [queryClient]);

  const filteredDrivers = drivers?.filter((driver) => {
    if (filter === 'all') return true;
    if (filter === 'available') return driver.status === 'available';
    if (filter === 'on_trip') return driver.status === 'on_trip';
    return true;
  });

  const driversWithLocation = filteredDrivers?.filter(
    (d) => d.current_trip?.current_location_lat != null
  ).length || 0;

  const formatTimeAgo = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const openInMaps = (lat: number, lng: number, label: string) => {
    haptics.selection();
    const url = `https://maps.google.com/?q=${lat},${lng}&label=${encodeURIComponent(label)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps');
    });
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'on_trip', label: 'On Trip' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-left" size="md" color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Driver Locations</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="map-pin" size="sm" color={colors.success} />
          <Text style={styles.statText}>
            {driversWithLocation} tracking
          </Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="users" size="sm" color={colors.textMuted} />
          <Text style={styles.statText}>
            {filteredDrivers?.length || 0} drivers
          </Text>
        </View>
      </View>

      {/* Filters */}
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

      {/* Driver List */}
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
        {filteredDrivers?.map((driver) => {
          const hasLocation = driver.current_trip?.current_location_lat != null;
          const location = hasLocation
            ? {
                lat: driver.current_trip!.current_location_lat!,
                lng: driver.current_trip!.current_location_lng!,
                city: driver.current_trip!.current_location_city,
                state: driver.current_trip!.current_location_state,
                updatedAt: driver.current_trip!.current_location_updated_at,
              }
            : null;

          return (
            <View key={driver.id} style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {driver.first_name?.[0]}{driver.last_name?.[0]}
                  </Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>
                    {driver.first_name} {driver.last_name}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(driver.status) + '20' },
                  ]}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(driver.status) },
                    ]} />
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(driver.status) },
                    ]}>
                      {formatStatus(driver.status)}
                    </Text>
                  </View>
                </View>
                {hasLocation && (
                  <Pressable
                    style={styles.mapButton}
                    onPress={() => openInMaps(
                      location!.lat,
                      location!.lng,
                      `${driver.first_name} ${driver.last_name}`
                    )}
                  >
                    <Icon name="external-link" size="sm" color={colors.primary} />
                  </Pressable>
                )}
              </View>

              {driver.current_trip && (
                <View style={styles.tripInfo}>
                  <View style={styles.tripRow}>
                    <Icon name="truck" size="sm" color={colors.primary} />
                    <Text style={styles.tripNumber}>{driver.current_trip.trip_number}</Text>
                    {driver.current_trip.origin_city && driver.current_trip.destination_city && (
                      <Text style={styles.tripRoute}>
                        {driver.current_trip.origin_city}, {driver.current_trip.origin_state} → {driver.current_trip.destination_city}, {driver.current_trip.destination_state}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {hasLocation ? (
                <View style={styles.locationInfo}>
                  <View style={styles.locationRow}>
                    <Icon name="map-pin" size="sm" color={colors.success} />
                    <Text style={styles.locationText}>
                      {location!.city && location!.state
                        ? `${location!.city}, ${location!.state}`
                        : `${location!.lat.toFixed(4)}, ${location!.lng.toFixed(4)}`}
                    </Text>
                  </View>
                  <Text style={styles.locationTime}>
                    Updated {formatTimeAgo(location!.updatedAt)}
                  </Text>
                </View>
              ) : driver.location_sharing_enabled ? (
                <View style={styles.noLocationInfo}>
                  <Icon name="map-pin" size="sm" color={colors.textMuted} />
                  <Text style={styles.noLocationText}>
                    Location sharing enabled, no recent location
                  </Text>
                </View>
              ) : (
                <View style={styles.noLocationInfo}>
                  <Icon name="map-pin" size="sm" color={colors.textMuted} />
                  <Text style={styles.noLocationText}>
                    Location sharing disabled
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {!isLoading && (!filteredDrivers || filteredDrivers.length === 0) && (
          <View style={styles.emptyState}>
            <Icon name="map-pin" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Drivers Found</Text>
            <Text style={styles.emptySubtitle}>
              {filter !== 'all' ? 'Try a different filter' : 'Add drivers from the web dashboard'}
            </Text>
          </View>
        )}

        <View style={{ height: insets.bottom + 80 }} />
      </ScrollView>
    </View>
  );
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case 'available': return colors.success;
    case 'on_trip': return colors.primary;
    case 'off_duty': return colors.textMuted;
    default: return colors.textMuted;
  }
}

function formatStatus(status: string | null): string {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  filterRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
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
    paddingTop: spacing.md,
  },
  driverCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    gap: spacing.xxs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  mapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripInfo: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tripNumber: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  tripRoute: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  locationInfo: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  locationText: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
  },
  locationTime: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 20,
  },
  noLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noLocationText: {
    ...typography.caption,
    color: colors.textMuted,
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
    textAlign: 'center',
  },
});
