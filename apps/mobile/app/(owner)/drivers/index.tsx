/**
 * Drivers Screen - View driver statuses and locations
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useOwner } from '../../../providers/OwnerProvider';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';

export default function DriversScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { company } = useOwner();

  const { data: drivers, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['drivers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('drivers')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          status,
          location_sharing_enabled
        `)
        .eq('owner_id', company.owner_id)
        .order('first_name');

      if (error) {
        console.error('Error fetching drivers:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!company?.id,
  });

  const availableCount = drivers?.filter(d => d.status === 'available').length || 0;
  const onTripCount = drivers?.filter(d => d.status === 'on_trip').length || 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Drivers</Text>
          <Pressable
            style={styles.mapButton}
            onPress={() => router.push('/(owner)/drivers/map')}
          >
            <Icon name="map" size="md" color={colors.primary} />
            <Text style={styles.mapButtonText}>Map View</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{drivers?.length || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{availableCount}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{onTripCount}</Text>
            <Text style={styles.statLabel}>On Trip</Text>
          </View>
        </View>
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
        {drivers?.map((driver) => (
          <Pressable
            key={driver.id}
            style={styles.driverCard}
            onPress={() => router.push(`/(owner)/drivers/${driver.id}`)}
          >
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {driver.first_name?.[0]}{driver.last_name?.[0]}
              </Text>
            </View>

            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>
                {driver.first_name} {driver.last_name}
              </Text>
              {driver.phone && (
                <Text style={styles.driverPhone}>{driver.phone}</Text>
              )}
            </View>

            <View style={styles.statusContainer}>
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
              {driver.location_sharing_enabled && (
                <Icon name="map-pin" size="sm" color={colors.primary} />
              )}
            </View>
          </Pressable>
        ))}

        {!isLoading && (!drivers || drivers.length === 0) && (
          <View style={styles.emptyState}>
            <Icon name="users" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Drivers</Text>
            <Text style={styles.emptySubtitle}>
              Add drivers from the web dashboard
            </Text>
          </View>
        )}
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
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  mapButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.screenPadding,
    paddingTop: 0,
    paddingBottom: spacing.xxxl + 80,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  driverPhone: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    gap: spacing.xs,
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
});
