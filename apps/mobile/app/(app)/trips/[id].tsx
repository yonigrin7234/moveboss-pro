import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Linking, Alert, TextInput, Image } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useDriverTripDetail } from '../../../hooks/useDriverTrips';
import { useTripActions, StartTripData } from '../../../hooks/useTripActions';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { StatusBadge } from '../../../components/StatusBadge';
import { TripLoad, TripStatus, LoadStatus } from '../../../types';

// Helper to get the next action for a load based on its status
const getLoadAction = (status: LoadStatus): { action: string; color: string } | null => {
  switch (status) {
    case 'pending':
      return { action: 'Accept', color: '#0066CC' };
    case 'accepted':
      return { action: 'Start Loading', color: '#f59e0b' };
    case 'loading':
      return { action: 'Finish Loading', color: '#f59e0b' };
    case 'loaded':
      return { action: 'Collect Payment', color: '#8b5cf6' };
    case 'in_transit':
      return { action: 'Complete Delivery', color: '#10b981' };
    case 'delivered':
    case 'storage_completed':
      return null; // No action needed
    default:
      return null;
  }
};

// Find the next load that needs action
const findNextActionableLoad = (loads: TripLoad[]): { load: TripLoad; action: string } | null => {
  // Sort by sequence
  const sorted = [...loads].sort((a, b) => a.sequence_index - b.sequence_index);

  for (const tripLoad of sorted) {
    const action = getLoadAction(tripLoad.loads.load_status);
    if (action) {
      return { load: tripLoad, action: action.action };
    }
  }
  return null;
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, loading, error, refetch } = useDriverTripDetail(id);
  const tripActions = useTripActions(id || '', refetch);
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

  // Find the next actionable load
  const nextStep = sortedLoads.length > 0 ? findNextActionableLoad(sortedLoads) : null;

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

            {/* Trip Action Card */}
            <TripActionCard
              status={trip.status}
              actions={tripActions}
              loadsCount={sortedLoads.length}
              nextStep={nextStep}
              tripId={trip.id}
            />

            {/* Equipment Card - Truck & Trailer */}
            {(trip.trucks || trip.trailers) && (
              <View style={styles.equipmentCard}>
                {trip.trucks && (
                  <View style={styles.equipmentItem}>
                    <Text style={styles.equipmentIcon}>🚛</Text>
                    <View style={styles.equipmentInfo}>
                      <Text style={styles.equipmentLabel}>Truck</Text>
                      <Text style={styles.equipmentValue}>{trip.trucks.unit_number}</Text>
                      {(trip.trucks.make || trip.trucks.model) && (
                        <Text style={styles.equipmentDetails}>
                          {[trip.trucks.year, trip.trucks.make, trip.trucks.model].filter(Boolean).join(' ')}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
                {trip.trailers && (
                  <View style={styles.equipmentItem}>
                    <Text style={styles.equipmentIcon}>📦</Text>
                    <View style={styles.equipmentInfo}>
                      <Text style={styles.equipmentLabel}>Trailer</Text>
                      <Text style={styles.equipmentValue}>{trip.trailers.unit_number}</Text>
                      {(trip.trailers.make || trip.trailers.model) && (
                        <Text style={styles.equipmentDetails}>
                          {[trip.trailers.year, trip.trailers.make, trip.trailers.model].filter(Boolean).join(' ')}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

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

  // Determine load label based on load_type
  const getLoadLabel = () => {
    // Pickup = picking up from customer's house
    if (load.load_type === 'pickup') {
      return 'Pickup';
    }
    // Everything else (company_load, live_load, rfd, etc.) = "Load"
    return 'Load';
  };

  // Live load shows "Load" with a LIVE badge
  const isLiveLoad = load.load_type === 'live_load';
  const loadLabel = getLoadLabel();

  // Get the action for this load
  const loadAction = getLoadAction(load.load_status);

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

  // Format display: "Load #123" or "Pickup #123" with optional LIVE badge
  const getDisplayTitle = () => {
    const number = load.job_number || load.load_number;
    if (number) {
      return `${loadLabel} #${number}`;
    }
    return `${loadLabel} ${tripLoad.sequence_index + 1}`;
  };

  return (
    <TouchableOpacity
      style={styles.loadCard}
      onPress={() => router.push(`/(app)/trips/${tripId}/loads/${load.id}`)}
    >
      <View style={styles.loadHeader}>
        <View style={styles.loadTitleRow}>
          <Text style={styles.loadNumber}>{getDisplayTitle()}</Text>
          {isLiveLoad && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          {load.delivery_order && (
            <View style={styles.deliveryOrderBadge}>
              <Text style={styles.deliveryOrderBadgeText}>#{load.delivery_order}</Text>
            </View>
          )}
        </View>
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

      {/* Action indicator for incomplete loads */}
      {loadAction && (
        <View style={[styles.loadActionBadge, { backgroundColor: loadAction.color }]}>
          <Text style={styles.loadActionText}>{loadAction.action} →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Trip Action Card Component
function TripActionCard({
  status,
  actions,
  loadsCount,
  nextStep,
  tripId,
}: {
  status: TripStatus;
  actions: ReturnType<typeof useTripActions>;
  loadsCount: number;
  nextStep: { load: TripLoad; action: string } | null;
  tripId: string;
}) {
  const router = useRouter();
  const { uploading, uploadOdometerPhoto } = useImageUpload();
  const [odometerInput, setOdometerInput] = useState('');
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const takeOdometerPhoto = async () => {
    const { status: permStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (permStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take odometer photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setOdometerPhoto(result.assets[0].uri);
    }
  };

  const handleStartTrip = async () => {
    const odometerValue = parseFloat(odometerInput);
    if (!odometerInput || isNaN(odometerValue) || odometerValue <= 0) {
      Alert.alert('Error', 'Please enter a valid odometer reading');
      return;
    }

    if (!odometerPhoto) {
      Alert.alert('Error', 'Please take a photo of the odometer');
      return;
    }

    setSubmitting(true);
    try {
      // Upload the photo first
      const uploadResult = await uploadOdometerPhoto(odometerPhoto, tripId, 'start');
      if (!uploadResult.success) {
        Alert.alert('Upload Error', uploadResult.error || 'Failed to upload odometer photo');
        return;
      }

      // Start the trip with odometer data
      const result = await actions.startTrip({
        odometerStart: odometerValue,
        odometerStartPhotoUrl: uploadResult.url!,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to start trip');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Planned → Start Trip (with odometer capture)
  if (status === 'planned') {
    const isReady = odometerInput && odometerPhoto && parseFloat(odometerInput) > 0;

    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Start Trip</Text>
        <Text style={styles.actionDescription}>
          {loadsCount > 0
            ? `${loadsCount} load${loadsCount > 1 ? 's' : ''} assigned`
            : 'No loads assigned yet'}
        </Text>

        {/* Odometer Input */}
        <View style={styles.odometerSection}>
          <Text style={styles.odometerLabel}>Starting Odometer</Text>
          <TextInput
            style={styles.odometerInput}
            placeholder="Enter current mileage"
            placeholderTextColor="#666"
            value={odometerInput}
            onChangeText={setOdometerInput}
            keyboardType="numeric"
          />
        </View>

        {/* Photo Capture */}
        <View style={styles.photoSection}>
          {odometerPhoto ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: odometerPhoto }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.retakeButton} onPress={takeOdometerPhoto}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoButton} onPress={takeOdometerPhoto}>
              <Text style={styles.photoButtonIcon}>📷</Text>
              <Text style={styles.photoButtonText}>Take Odometer Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!isReady || actions.loading || submitting || uploading) && styles.buttonDisabled
          ]}
          onPress={handleStartTrip}
          disabled={!isReady || actions.loading || submitting || uploading}
        >
          <Text style={styles.primaryButtonText}>
            {submitting || uploading ? 'Starting Trip...' : 'Start Trip'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Active/En Route → Show next step or complete trip
  if (status === 'active' || status === 'en_route') {
    const handleCompleteTrip = async () => {
      const result = await actions.completeTrip();
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to complete trip');
      }
    };

    // If there's a next step, show guidance to the next load
    if (nextStep) {
      const loadLabel = nextStep.load.loads.load_type === 'pickup' ? 'Pickup' : 'Load';
      const loadNumber = nextStep.load.loads.job_number || nextStep.load.loads.load_number || `${nextStep.load.sequence_index + 1}`;

      return (
        <View style={styles.nextStepCard}>
          <View style={styles.nextStepHeader}>
            <Text style={styles.nextStepLabel}>NEXT STEP</Text>
          </View>
          <Text style={styles.nextStepTitle}>{nextStep.action}</Text>
          <Text style={styles.nextStepDescription}>
            {loadLabel} #{loadNumber}
          </Text>
          <TouchableOpacity
            style={styles.nextStepButton}
            onPress={() => router.push(`/(app)/trips/${tripId}/loads/${nextStep.load.loads.id}`)}
          >
            <Text style={styles.nextStepButtonText}>Go to {loadLabel}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // All loads delivered - show complete trip
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>All Loads Completed!</Text>
        <Text style={styles.actionDescription}>
          Ready to complete this trip
        </Text>
        <TouchableOpacity
          style={[styles.completeButton, actions.loading && styles.buttonDisabled]}
          onPress={handleCompleteTrip}
          disabled={actions.loading}
        >
          <Text style={styles.primaryButtonText}>
            {actions.loading ? 'Completing...' : 'Complete Trip'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Completed/Settled → No action needed
  if (status === 'completed' || status === 'settled') {
    return (
      <View style={styles.completedCard}>
        <Text style={styles.completedText}>
          {status === 'completed' ? '✓ Trip Completed' : '✓ Trip Settled'}
        </Text>
      </View>
    );
  }

  return null;
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
  loadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  deliveryOrderBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deliveryOrderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
  // Trip Action Card
  // Equipment Card Styles
  equipmentCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 16,
  },
  equipmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  equipmentIcon: {
    fontSize: 24,
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  equipmentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  equipmentDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // Trip Action Card
  actionCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  completedText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  // Next Step Card
  nextStepCard: {
    backgroundColor: '#0066CC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  nextStepHeader: {
    marginBottom: 8,
  },
  nextStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  nextStepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  nextStepDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
  },
  nextStepButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextStepButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Load Action Badge
  loadActionBadge: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Odometer Input Styles
  odometerSection: {
    marginTop: 16,
  },
  odometerLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  odometerInput: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#3a3a4e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Photo Capture Styles
  photoSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  photoButton: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#3a3a4e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  photoButtonIcon: {
    fontSize: 24,
  },
  photoButtonText: {
    color: '#888',
    fontSize: 16,
  },
  photoPreviewContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
  },
  retakeButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
