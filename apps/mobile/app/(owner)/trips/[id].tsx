/**
 * Trip Detail Screen - View and manage trip with assigned loads
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';

type Tab = 'overview' | 'loads';

interface TripLoad {
  id: string;
  load_id: string;
  sequence_index: number;
  role: string;
  load: {
    id: string;
    load_number: string;
    pickup_city: string | null;
    pickup_state: string | null;
    delivery_city: string | null;
    delivery_state: string | null;
    cuft: number | null;
    rate_per_cuft: number | null;
    status: string;
    rfd_date: string | null;
  };
}

interface Trip {
  id: string;
  trip_number: string;
  reference_number: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  total_miles: number | null;
  revenue_total: number;
  driver_pay_total: number;
  profit_total: number;
  notes: string | null;
  driver: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
  truck: {
    id: string;
    unit_number: string;
  } | null;
  trailer: {
    id: string;
    unit_number: string;
  } | null;
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Fetch trip details
  const { data: trip, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['trip-detail', id],
    queryFn: async (): Promise<Trip | null> => {
      if (!id) return null;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          trip_number,
          reference_number,
          status,
          start_date,
          end_date,
          origin_city,
          origin_state,
          destination_city,
          destination_state,
          total_miles,
          revenue_total,
          driver_pay_total,
          profit_total,
          notes,
          driver:drivers(
            id,
            first_name,
            last_name,
            phone
          ),
          truck:trucks(
            id,
            unit_number
          ),
          trailer:trailers(
            id,
            unit_number
          )
        `)
        .eq('id', id)
        .eq('owner_id', user.user.id)
        .single();

      if (error) {
        console.error('Error fetching trip:', error);
        return null;
      }

      return {
        ...data,
        driver: Array.isArray(data.driver) ? data.driver[0] : data.driver,
        truck: Array.isArray(data.truck) ? data.truck[0] : data.truck,
        trailer: Array.isArray(data.trailer) ? data.trailer[0] : data.trailer,
      };
    },
    enabled: !!id,
  });

  // Fetch trip loads
  const { data: tripLoads, isLoading: loadsLoading } = useQuery({
    queryKey: ['trip-loads', id],
    queryFn: async (): Promise<TripLoad[]> => {
      if (!id) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('trip_loads')
        .select(`
          id,
          load_id,
          sequence_index,
          role,
          load:loads(
            id,
            load_number,
            pickup_city,
            pickup_state,
            delivery_city,
            delivery_state,
            cuft,
            rate_per_cuft,
            status,
            rfd_date
          )
        `)
        .eq('trip_id', id)
        .eq('owner_id', user.user.id)
        .order('sequence_index', { ascending: true });

      if (error) {
        console.error('Error fetching trip loads:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        load: Array.isArray(item.load) ? item.load[0] : item.load,
      }));
    },
    enabled: !!id,
  });

  // Remove load from trip mutation
  const removeLoadMutation = useMutation({
    mutationFn: async (loadId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('trip_loads')
        .delete()
        .eq('trip_id', id)
        .eq('load_id', loadId)
        .eq('owner_id', user.user.id);

      if (error) throw error;

      // Clear driver/equipment from load
      await supabase
        .from('loads')
        .update({
          delivery_order: null,
          assigned_driver_id: null,
          assigned_driver_name: null,
          assigned_driver_phone: null,
          assigned_truck_id: null,
          assigned_trailer_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loadId);
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['trip-loads', id] });
      queryClient.invalidateQueries({ queryKey: ['trip-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
    onError: (error) => {
      haptics.error();
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove load');
    },
  });

  const handleRemoveLoad = (loadId: string, loadNumber: string) => {
    haptics.selection();
    Alert.alert(
      'Remove Load',
      `Remove ${loadNumber} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeLoadMutation.mutate(loadId),
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading || !trip) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-left" size="md" color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
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
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'loads' && styles.tabActive]}
          onPress={() => setActiveTab('loads')}
        >
          <Text style={[styles.tabText, activeTab === 'loads' && styles.tabTextActive]}>
            Loads ({tripLoads?.length || 0})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'overview' ? (
          <>
            {/* Route */}
            {(trip.origin_city || trip.destination_city) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Route</Text>
                <View style={styles.routeDisplay}>
                  {trip.origin_city && (
                    <View style={styles.routePoint}>
                      <Icon name="map-pin" size="sm" color={colors.success} />
                      <Text style={styles.routeText}>
                        {trip.origin_city}, {trip.origin_state}
                      </Text>
                    </View>
                  )}
                  {trip.origin_city && trip.destination_city && (
                    <View style={styles.routeArrow}>
                      <Icon name="arrow-right" size="sm" color={colors.textMuted} />
                    </View>
                  )}
                  {trip.destination_city && (
                    <View style={styles.routePoint}>
                      <Icon name="map-pin" size="sm" color={colors.error} />
                      <Text style={styles.routeText}>
                        {trip.destination_city}, {trip.destination_state}
                      </Text>
                    </View>
                  )}
                </View>
                {trip.total_miles && (
                  <Text style={styles.milesText}>{trip.total_miles} miles</Text>
                )}
              </View>
            )}

            {/* Driver & Equipment */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Driver & Equipment</Text>
              <View style={styles.infoRow}>
                <Icon name="user" size="sm" color={colors.textMuted} />
                <Text style={styles.infoText}>
                  {trip.driver
                    ? `${trip.driver.first_name} ${trip.driver.last_name}`
                    : 'No driver assigned'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="truck" size="sm" color={colors.textMuted} />
                <Text style={styles.infoText}>
                  {trip.truck ? trip.truck.unit_number : 'No truck'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="box" size="sm" color={colors.textMuted} />
                <Text style={styles.infoText}>
                  {trip.trailer ? trip.trailer.unit_number : 'No trailer'}
                </Text>
              </View>
            </View>

            {/* Dates */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dates</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Start</Text>
                  <Text style={styles.dateValue}>
                    {trip.start_date
                      ? new Date(trip.start_date).toLocaleDateString()
                      : 'TBD'}
                  </Text>
                </View>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>End</Text>
                  <Text style={styles.dateValue}>
                    {trip.end_date
                      ? new Date(trip.end_date).toLocaleDateString()
                      : 'TBD'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Financials */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Financials</Text>
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Revenue</Text>
                <Text style={styles.financialValue}>
                  {formatCurrency(trip.revenue_total)}
                </Text>
              </View>
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Driver Pay</Text>
                <Text style={[styles.financialValue, { color: colors.error }]}>
                  -{formatCurrency(trip.driver_pay_total)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.financialRow}>
                <Text style={[styles.financialLabel, styles.profitLabel]}>Profit</Text>
                <Text style={[
                  styles.financialValue,
                  styles.profitValue,
                  { color: trip.profit_total >= 0 ? colors.success : colors.error },
                ]}>
                  {formatCurrency(trip.profit_total)}
                </Text>
              </View>
            </View>

            {/* Notes */}
            {trip.notes && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Notes</Text>
                <Text style={styles.notesText}>{trip.notes}</Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Add Load Button */}
            <Pressable
              style={styles.addLoadButton}
              onPress={() => {
                haptics.selection();
                // Navigate to loads list with filter to add
                router.push('/(owner)/loads');
              }}
            >
              <Icon name="plus" size="sm" color={colors.primary} />
              <Text style={styles.addLoadText}>Add Load to Trip</Text>
            </Pressable>

            {/* Loads List */}
            {loadsLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : tripLoads && tripLoads.length > 0 ? (
              tripLoads.map((tripLoad, index) => {
                const load = tripLoad.load;
                if (!load) return null;

                const totalRate = load.cuft && load.rate_per_cuft
                  ? load.cuft * load.rate_per_cuft
                  : null;

                return (
                  <View key={tripLoad.id} style={styles.loadCard}>
                    <View style={styles.loadSequence}>
                      <Text style={styles.sequenceNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.loadContent}>
                      <View style={styles.loadHeader}>
                        <Text style={styles.loadNumber}>{load.load_number}</Text>
                        <View style={[
                          styles.loadStatusBadge,
                          { backgroundColor: getLoadStatusColor(load.status) + '20' },
                        ]}>
                          <Text style={[
                            styles.loadStatusText,
                            { color: getLoadStatusColor(load.status) },
                          ]}>
                            {formatStatus(load.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.loadRoute}>
                        {load.pickup_city && `${load.pickup_city}, ${load.pickup_state}`}
                        {load.pickup_city && load.delivery_city && ' → '}
                        {load.delivery_city && `${load.delivery_city}, ${load.delivery_state}`}
                      </Text>
                      <View style={styles.loadDetails}>
                        {load.cuft && (
                          <Text style={styles.loadDetailText}>{load.cuft} CF</Text>
                        )}
                        {totalRate && (
                          <Text style={styles.loadDetailText}>
                            ${totalRate.toFixed(0)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => handleRemoveLoad(load.id, load.load_number)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="x" size="sm" color={colors.error} />
                    </Pressable>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icon name="package" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Loads Assigned</Text>
                <Text style={styles.emptySubtitle}>
                  Add loads to this trip from the Loads screen
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: insets.bottom + 80 }} />
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
    case 'settled': return colors.success;
    case 'cancelled': return colors.error;
    default: return colors.textMuted;
  }
}

function getLoadStatusColor(status: string): string {
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  headerCenter: {
    alignItems: 'center',
  },
  tripNumber: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.screenPadding,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  routeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  routeText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  routeArrow: {
    paddingHorizontal: spacing.xs,
  },
  milesText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xxs,
  },
  dateValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  financialLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  financialValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  profitLabel: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profitValue: {
    ...typography.headline,
  },
  notesText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  addLoadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addLoadText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  loadSequence: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sequenceNumber: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  loadContent: {
    flex: 1,
  },
  loadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  loadNumber: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  loadStatusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  loadRoute: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  loadDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  loadDetailText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
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
