import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useDriverTripDetail } from '../../../hooks/useDriverTrips';
import { StatusBadge } from '../../../components/StatusBadge';
import { TripLoad } from '../../../types';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, loading, error, refetch } = useDriverTripDetail(id);
  const router = useRouter();

  const formatRoute = () => {
    if (!trip) return '';
    const origin = [trip.origin_city, trip.origin_state].filter(Boolean).join(', ');
    const destination = [trip.destination_city, trip.destination_state].filter(Boolean).join(', ');
    if (origin && destination) {
      return `${origin} → ${destination}`;
    }
    return origin || destination || 'No route set';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  // Sort loads by sequence
  const sortedLoads = trip?.trip_loads
    ?.slice()
    .sort((a, b) => a.sequence_index - b.sequence_index) || [];

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip Details' }} />
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      </>
    );
  }

  if (!trip && !loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip Details' }} />
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Trip not found</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Trip #${trip?.trip_number || '...'}`,
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#0066CC" />
        }
      >
        {trip && (
          <>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.tripNumber}>Trip #{trip.trip_number}</Text>
                <Text style={styles.route}>{formatRoute()}</Text>
              </View>
              <StatusBadge status={trip.status} />
            </View>

            {/* Trip Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Trip Information</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Start Date</Text>
                  <Text style={styles.infoValue}>{formatDate(trip.start_date)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>End Date</Text>
                  <Text style={styles.infoValue}>{formatDate(trip.end_date)}</Text>
                </View>
                {trip.actual_miles && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Miles</Text>
                    <Text style={styles.infoValue}>{trip.actual_miles.toLocaleString()}</Text>
                  </View>
                )}
                {trip.total_cuft && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Total CUFT</Text>
                    <Text style={styles.infoValue}>{trip.total_cuft.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Loads Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Loads ({sortedLoads.length})</Text>
              {sortedLoads.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No loads assigned</Text>
                </View>
              ) : (
                sortedLoads.map((tripLoad) => (
                  <LoadCard key={tripLoad.id} tripLoad={tripLoad} tripId={trip.id} />
                ))
              )}
            </View>

            {/* Expenses Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Expenses ({trip.trip_expenses?.length || 0})
                </Text>
                <TouchableOpacity
                  onPress={() => router.push(`/(app)/trips/${trip.id}/expenses`)}
                >
                  <Text style={styles.addLink}>Add Expense</Text>
                </TouchableOpacity>
              </View>
              {!trip.trip_expenses?.length ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No expenses recorded</Text>
                </View>
              ) : (
                <View style={styles.expensesList}>
                  {trip.trip_expenses.map((expense) => (
                    <View key={expense.id} style={styles.expenseItem}>
                      <View>
                        <Text style={styles.expenseCategory}>
                          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                        </Text>
                        {expense.description && (
                          <Text style={styles.expenseDescription}>{expense.description}</Text>
                        )}
                      </View>
                      <Text style={styles.expenseAmount}>
                        {formatCurrency(expense.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

// Load Card Component
function LoadCard({ tripLoad, tripId }: { tripLoad: TripLoad; tripId: string }) {
  const router = useRouter();
  const load = tripLoad.loads;

  const getPickupLocation = () => {
    return [load.pickup_city, load.pickup_state].filter(Boolean).join(', ') || 'Not set';
  };

  const getDeliveryLocation = () => {
    const city = load.dropoff_city || load.delivery_city;
    const state = load.dropoff_state || load.delivery_state;
    return [city, state].filter(Boolean).join(', ') || 'Not set';
  };

  const handleCall = (phone: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  return (
    <TouchableOpacity
      style={styles.loadCard}
      onPress={() => router.push(`/(app)/trips/${tripId}/loads/${load.id}`)}
    >
      <View style={styles.loadHeader}>
        <Text style={styles.loadNumber}>
          {load.job_number || load.load_number || `Load ${tripLoad.sequence_index + 1}`}
        </Text>
        <StatusBadge status={load.load_status} size="small" />
      </View>

      <View style={styles.loadRoute}>
        <View style={styles.loadStop}>
          <View style={styles.stopDot} />
          <Text style={styles.loadLocation}>{getPickupLocation()}</Text>
        </View>
        <View style={styles.stopLine} />
        <View style={styles.loadStop}>
          <View style={[styles.stopDot, styles.stopDotEnd]} />
          <Text style={styles.loadLocation}>{getDeliveryLocation()}</Text>
        </View>
      </View>

      {load.companies?.name && (
        <View style={styles.loadCompany}>
          <Text style={styles.loadCompanyName}>{load.companies.name}</Text>
          {load.companies.phone && (
            <TouchableOpacity onPress={() => handleCall(load.companies?.phone || null)}>
              <Text style={styles.callLink}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {load.actual_cuft_loaded && (
        <Text style={styles.loadCuft}>{load.actual_cuft_loaded} CUFT</Text>
      )}
    </TouchableOpacity>
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
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  tripNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  route: {
    fontSize: 16,
    color: '#888',
  },
  card: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
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
  addLink: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  // Load Card
  loadCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadRoute: {
    marginBottom: 12,
  },
  loadStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0066CC',
  },
  stopDotEnd: {
    backgroundColor: '#10b981',
  },
  stopLine: {
    width: 2,
    height: 20,
    backgroundColor: '#3a3a4e',
    marginLeft: 4,
  },
  loadLocation: {
    fontSize: 14,
    color: '#ccc',
  },
  loadCompany: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3a4e',
  },
  loadCompanyName: {
    fontSize: 14,
    color: '#888',
  },
  callLink: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '500',
  },
  loadCuft: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  // Expenses
  expensesList: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a4e',
  },
  expenseCategory: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  // States
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
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    margin: 20,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
});
