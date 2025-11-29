import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useDriverTrips } from '../../../hooks/useDriverTrips';
import { TripCard } from '../../../components/TripCard';
import { Trip, TripStatus } from '../../../types';

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

    // Within same status, sort by date (newest first)
    const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
    const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
    return dateB - dateA;
  });
}

export default function TripsScreen() {
  const { trips, loading, error, refetch } = useDriverTrips();
  const sortedTrips = sortTrips(trips);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Trips',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      />
      <View style={styles.container}>
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <FlatList
          data={sortedTrips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TripCard trip={item} variant="compact" />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#0066CC" />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No trips</Text>
                <Text style={styles.emptyStateText}>
                  Trips assigned to you will appear here
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginBottom: 0,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
});
