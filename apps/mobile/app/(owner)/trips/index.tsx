/**
 * Trips Screen - View and manage trips
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

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { company } = useOwner();

  const { data: trips, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['owner-trips', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          trip_number,
          status,
          start_date,
          end_date,
          origin_city,
          origin_state,
          destination_city,
          destination_state,
          driver:drivers(
            first_name,
            last_name
          )
        `)
        .eq('owner_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching trips:', error);
        return [];
      }

      return (data || []).map(trip => ({
        ...trip,
        driver: Array.isArray(trip.driver) ? trip.driver[0] : trip.driver,
      }));
    },
    enabled: !!company?.id,
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Trips</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/(owner)/trips/new')}
          >
            <Icon name="plus" size="md" color={colors.white} />
          </Pressable>
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
        {trips?.map((trip) => (
          <Pressable
            key={trip.id}
            style={styles.tripCard}
            onPress={() => router.push(`/(owner)/trips/${trip.id}`)}
          >
            <View style={styles.tripHeader}>
              <Text style={styles.tripNumber}>{trip.trip_number}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(trip.status) + '20' },
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(trip.status) },
                ]}>
                  {formatStatus(trip.status)}
                </Text>
              </View>
            </View>

            {(trip.origin_city || trip.destination_city) && (
              <View style={styles.routeRow}>
                <Icon name="map-pin" size="sm" color={colors.textMuted} />
                <Text style={styles.routeText}>
                  {trip.origin_city && `${trip.origin_city}, ${trip.origin_state}`}
                  {trip.origin_city && trip.destination_city && ' → '}
                  {trip.destination_city && `${trip.destination_city}, ${trip.destination_state}`}
                </Text>
              </View>
            )}

            {trip.driver && (
              <View style={styles.driverRow}>
                <Icon name="user" size="sm" color={colors.textMuted} />
                <Text style={styles.driverName}>
                  {trip.driver.first_name} {trip.driver.last_name}
                </Text>
              </View>
            )}

            {trip.start_date && (
              <Text style={styles.dateText}>
                {new Date(trip.start_date).toLocaleDateString()}
              </Text>
            )}
          </Pressable>
        ))}

        {!isLoading && (!trips || trips.length === 0) && (
          <View style={styles.emptyState}>
            <Icon name="truck" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Trips</Text>
            <Text style={styles.emptySubtitle}>
              Create your first trip
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'planned': return colors.info;
    case 'active': return colors.primary;
    case 'en_route': return colors.warning;
    case 'completed': return colors.success;
    case 'settled': return colors.successSoft ? colors.success : colors.success;
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
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.screenPadding,
    paddingTop: 0,
    paddingBottom: spacing.xxxl + 80,
  },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tripNumber: {
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
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  driverName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dateText: {
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
  },
});
