import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverTrips } from '../../../hooks/useDriverTrips';
import { TripCard } from '../../../components/TripCard';
import { EmptyState, TripCardSkeleton, ErrorState } from '../../../components/ui';
import { Trip, TripStatus } from '../../../types';
import { colors, typography, spacing, radius } from '../../../lib/theme';

// Sort trips by status priority and date
function sortTrips(trips: Trip[]): Trip[] {
  const statusPriority: Record<TripStatus, number> = {
    active: 0,
    en_route: 1,
    planned: 2,
    completed: 3,
    settled: 4,
    cancelled: 5,
  };

  return [...trips].sort((a, b) => {
    const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
    if (priorityDiff !== 0) return priorityDiff;

    const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
    const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
    return dateB - dateA;
  });
}

// Memoized trip card for performance
const MemoizedTripCard = React.memo(function MemoizedTripCard({ trip }: { trip: Trip }) {
  return <TripCard trip={trip} variant="compact" />;
});

export default function TripsScreen() {
  const { trips, loading, error, refetch } = useDriverTrips();
  const insets = useSafeAreaInsets();
  const sortedTrips = sortTrips(trips);

  const renderItem = useCallback(({ item }: { item: Trip }) => (
    <MemoizedTripCard trip={item} />
  ), []);

  const keyExtractor = useCallback((item: Trip) => item.id, []);

  const ListEmptyComponent = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.skeletonList}>
          <TripCardSkeleton style={styles.skeletonCard} />
          <TripCardSkeleton style={styles.skeletonCard} />
          <TripCardSkeleton />
        </View>
      );
    }
    return (
      <EmptyState
        illustration="no-trips"
        title="No trips yet"
        description="Trips assigned to you will appear here"
      />
    );
  }, [loading]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Trips',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <View style={styles.container}>
        {error && (
          <View style={{ margin: spacing.screenPadding, marginBottom: 0 }}>
            <ErrorState title="Unable to load trips" message={error} actionLabel="Retry" onAction={refetch} />
          </View>
        )}

        <FlatList
          data={sortedTrips}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={loading && sortedTrips.length > 0}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={ListEmptyComponent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.screenPadding,
    flexGrow: 1,
  },
  skeletonList: {
    gap: spacing.md,
  },
  skeletonCard: {
    marginBottom: spacing.md,
  },
});
