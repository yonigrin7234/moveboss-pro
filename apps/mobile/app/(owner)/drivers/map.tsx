/**
 * Driver Map Screen - Real-time driver locations on an actual map
 * Shows driver markers with their current positions
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { supabase } from '../../../lib/supabase';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius } from '../../../lib/theme';

interface DriverLocation {
  id: string;
  first_name: string;
  last_name: string;
  status: string | null;
  location_sharing_enabled: boolean;
  current_trip?: {
    id: string;
    trip_number: string;
    current_location_lat: number | null;
    current_location_lng: number | null;
    current_location_city: string | null;
    current_location_state: string | null;
    current_location_updated_at: string | null;
  } | null;
}

// Default to continental US center
const DEFAULT_REGION = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 30,
  longitudeDelta: 30,
};

export default function DriverMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);

  // Fetch drivers with their current locations
  const { data: drivers, isLoading, refetch } = useQuery({
    queryKey: ['driver-locations-map'],
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
          status,
          location_sharing_enabled
        `)
        .eq('owner_id', user.user.id)
        .order('first_name');

      if (driversError) {
        console.error('Error fetching drivers:', driversError);
        return [];
      }

      // For each driver, get their active trip with location
      const driversWithLocations: DriverLocation[] = await Promise.all(
        (driversData || []).map(async (driver) => {
          let currentTrip = null;

          if (driver.status === 'on_trip' || driver.location_sharing_enabled) {
            const { data: tripData } = await supabase
              .from('trips')
              .select(`
                id,
                trip_number,
                current_location_lat,
                current_location_lng,
                current_location_city,
                current_location_state,
                current_location_updated_at
              `)
              .eq('driver_id', driver.id)
              .in('status', ['active', 'en_route', 'in_progress'])
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

  // Set up real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const channel = supabase
        .channel('driver-map-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'trips',
            filter: `owner_id=eq.${user.user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['driver-locations-map'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [queryClient]);

  // Drivers with valid locations
  const driversWithLocation = drivers?.filter(
    (d) => d.current_trip?.current_location_lat != null && d.current_trip?.current_location_lng != null
  ) || [];

  // Fit map to show all drivers
  useEffect(() => {
    if (driversWithLocation.length > 0 && mapRef.current) {
      const coordinates = driversWithLocation.map((d) => ({
        latitude: d.current_trip!.current_location_lat!,
        longitude: d.current_trip!.current_location_lng!,
      }));

      // Small delay to ensure map is ready
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [driversWithLocation.length]);

  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case 'available': return colors.success;
      case 'on_trip': return colors.primary;
      case 'off_duty': return colors.textMuted;
      default: return colors.textMuted;
    }
  };

  const formatTimeAgo = (dateString: string | null): string => {
    if (!dateString) return 'Unknown';
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-left" size="md" color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Driver Map</Text>
        <Pressable style={styles.refreshButton} onPress={() => refetch()}>
          <Icon name="refresh-cw" size="md" color={colors.primary} />
        </Pressable>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.success }]} />
          <Text style={styles.statText}>
            {driversWithLocation.length} tracking
          </Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.textMuted }]} />
          <Text style={styles.statText}>
            {(drivers?.length || 0) - driversWithLocation.length} offline
          </Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading driver locations...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={DEFAULT_REGION}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            mapType="standard"
          >
            {driversWithLocation.map((driver) => (
              <Marker
                key={driver.id}
                coordinate={{
                  latitude: driver.current_trip!.current_location_lat!,
                  longitude: driver.current_trip!.current_location_lng!,
                }}
                onPress={() => setSelectedDriver(driver)}
              >
                {/* Custom Marker */}
                <View style={styles.markerContainer}>
                  <View style={[styles.marker, { backgroundColor: getStatusColor(driver.status) }]}>
                    <Text style={styles.markerText}>
                      {driver.first_name?.[0]}{driver.last_name?.[0]}
                    </Text>
                  </View>
                  <View style={[styles.markerArrow, { borderTopColor: getStatusColor(driver.status) }]} />
                </View>

                {/* Callout */}
                <Callout tooltip>
                  <View style={styles.callout}>
                    <Text style={styles.calloutName}>
                      {driver.first_name} {driver.last_name}
                    </Text>
                    {driver.current_trip?.current_location_city && (
                      <Text style={styles.calloutLocation}>
                        {driver.current_trip.current_location_city}, {driver.current_trip.current_location_state}
                      </Text>
                    )}
                    <Text style={styles.calloutTime}>
                      Updated {formatTimeAgo(driver.current_trip?.current_location_updated_at || null)}
                    </Text>
                    {driver.current_trip?.trip_number && (
                      <Text style={styles.calloutTrip}>
                        Trip: {driver.current_trip.trip_number}
                      </Text>
                    )}
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        )}

        {/* No drivers message */}
        {!isLoading && driversWithLocation.length === 0 && (
          <View style={styles.noDriversOverlay}>
            <View style={styles.noDriversCard}>
              <Icon name="map-pin" size={32} color={colors.textMuted} />
              <Text style={styles.noDriversTitle}>No Active Locations</Text>
              <Text style={styles.noDriversText}>
                Drivers will appear on the map when they have active trips with location tracking enabled.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>On Trip</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
          <Text style={styles.legendText}>Off Duty</Text>
        </View>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    zIndex: 10,
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
  refreshButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.sm,
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
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  callout: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  calloutLocation: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  calloutTime: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  calloutTrip: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  noDriversOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  noDriversCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  noDriversTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  noDriversText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
