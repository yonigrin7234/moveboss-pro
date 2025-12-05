import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Linking, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverTripDetail } from '../../../hooks/useDriverTrips';
import { useTripActions } from '../../../hooks/useTripActions';
import { StatusBadge } from '../../../components/StatusBadge';
import { Icon } from '../../../components/ui';
import { TripLoad, TripStatus, LoadStatus } from '../../../types';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';

// Helper to get the next action for a load based on its status
const getLoadAction = (status: LoadStatus): { action: string; color: string } | null => {
  switch (status) {
    case 'pending':
      return { action: 'Accept', color: colors.primary };
    case 'accepted':
      return { action: 'Start Loading', color: colors.warning };
    case 'loading':
      return { action: 'Finish Loading', color: colors.warning };
    case 'loaded':
      return { action: 'Collect Payment', color: colors.info };
    case 'in_transit':
      return { action: 'Complete Delivery', color: colors.success };
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
  const insets = useSafeAreaInsets();

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
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.sectionGap }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
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
                  style={styles.touchTarget}
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
            <TouchableOpacity
              onPress={() => handleCall(load.companies?.phone || null)}
              style={styles.touchTarget}
            >
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

  // Planned → Navigate to full-screen start experience
  if (status === 'planned') {
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Ready to Roll?</Text>
        <Text style={styles.actionDescription}>
          {loadsCount > 0
            ? `${loadsCount} load${loadsCount > 1 ? 's' : ''} assigned`
            : 'No loads assigned yet'}
        </Text>

        <TouchableOpacity
          style={styles.startTripButton}
          onPress={() => router.push(`/(app)/trips/${tripId}/start`)}
        >
          <View style={styles.startTripButtonContent}>
            <Text style={styles.startTripButtonText}>Start Trip</Text>
            <Icon name="rocket" size="md" color={colors.white} />
          </View>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenPadding,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sectionGap,
  },
  tripNumber: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  route: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.sectionGap,
  },
  cardTitle: {
    ...typography.subheadline,
    marginBottom: spacing.lg,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  infoItem: {
    minWidth: '45%',
  },
  infoLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.subheadline,
  },
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.itemGap,
  },
  sectionTitle: {
    ...typography.headline,
    marginBottom: spacing.itemGap,
  },
  touchTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  addLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: spacing.itemGap,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sectionGap,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  // Load Card
  loadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.itemGap,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.itemGap,
  },
  loadNumber: {
    ...typography.subheadline,
  },
  loadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  deliveryOrderBadge: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  deliveryOrderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loadRoute: {
    marginBottom: spacing.itemGap,
  },
  loadStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.itemGap,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  stopDotEnd: {
    backgroundColor: colors.success,
  },
  stopLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.borderLight,
    marginLeft: 4,
  },
  loadLocation: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  loadCompany: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.itemGap,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  loadCompanyName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  callLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  loadCuft: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  // Expenses
  expensesList: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.cardPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  expenseCategory: {
    ...typography.subheadline,
  },
  expenseDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  expenseAmount: {
    ...typography.subheadline,
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
    ...typography.headline,
    color: colors.textSecondary,
  },
  errorCard: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    margin: spacing.screenPadding,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  // Equipment Card Styles
  equipmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  equipmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.itemGap,
  },
  equipmentIcon: {
    fontSize: 24,
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  equipmentValue: {
    ...typography.subheadline,
    fontWeight: '600',
  },
  equipmentDetails: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.xxs,
    textTransform: 'none',
  },
  // Trip Action Card
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.sectionGap,
  },
  actionTitle: {
    ...typography.headline,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  actionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completedCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
    alignItems: 'center',
  },
  completedText: {
    ...typography.subheadline,
    color: colors.success,
    fontWeight: '600',
  },
  // Next Step Card
  nextStepCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.sectionGap,
  },
  nextStepHeader: {
    marginBottom: spacing.sm,
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
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  nextStepDescription: {
    ...typography.subheadline,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.lg,
  },
  nextStepButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  nextStepButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  // Start Trip Button
  startTripButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    minHeight: 44,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  startTripButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  startTripButtonText: {
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Load Action Badge
  loadActionBadge: {
    marginTop: spacing.itemGap,
    paddingVertical: 10,
    paddingHorizontal: spacing.cardPadding,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  loadActionText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  // Odometer Input Styles
  odometerSection: {
    marginTop: spacing.lg,
  },
  odometerLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  odometerInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    minHeight: 44,
  },
  // Photo Capture Styles
  photoSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  photoButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.cardPaddingLarge,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    minHeight: 44,
  },
  photoButtonIcon: {
    fontSize: 24,
  },
  photoButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  photoPreviewContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 150,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  retakeButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    minHeight: 44,
  },
  retakeButtonText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
