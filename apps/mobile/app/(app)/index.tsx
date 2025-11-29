import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { useActiveTrip } from '../../hooks/useDriverTrips';
import { TripCard } from '../../components/TripCard';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { activeTrip, upcomingTrips, recentTrips, loading, error, refetch } = useActiveTrip();
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#0066CC" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/(app)/trips')}
        >
          <Text style={styles.quickActionIcon}>🚛</Text>
          <Text style={styles.quickActionLabel}>All Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/(app)/earnings')}
        >
          <Text style={styles.quickActionIcon}>💰</Text>
          <Text style={styles.quickActionLabel}>Earnings</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Active Trip Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Trip</Text>
        {activeTrip ? (
          <TripCard trip={activeTrip} />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active trip</Text>
            <Text style={styles.emptySubtext}>
              Your current trip will appear here when started
            </Text>
          </View>
        )}
      </View>

      {/* Upcoming Trips Section */}
      {upcomingTrips.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Trips</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/trips')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {upcomingTrips.slice(0, 3).map(trip => (
            <TripCard key={trip.id} trip={trip} variant="compact" />
          ))}
        </View>
      )}

      {/* Recent Trips Section */}
      {recentTrips.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/trips')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentTrips.slice(0, 3).map(trip => (
            <TripCard key={trip.id} trip={trip} variant="compact" />
          ))}
        </View>
      )}

      {/* Empty State */}
      {!loading && !activeTrip && upcomingTrips.length === 0 && recentTrips.length === 0 && !error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No trips yet</Text>
          <Text style={styles.emptyStateText}>
            Trips assigned to you will appear here
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#888',
  },
  signOutButton: {
    backgroundColor: '#3a3a4e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  seeAll: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
    marginBottom: 24,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});
