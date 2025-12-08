import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverTripDetail } from '../../../hooks/useDriverTrips';
import { useTripActions } from '../../../hooks/useTripActions';
import { StatusBadge } from '../../../components/StatusBadge';
import { TripDetailSkeleton } from '../../../components/ui';
import { LoadCard, TripActionCard } from '../../../components/trip';
import { findNextActionableLoad, formatTripDate, formatCurrency } from '../../../lib/tripUtils';
import { colors, typography, spacing, radius } from '../../../lib/theme';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, loading, error, refetch, isRefreshing } = useDriverTripDetail(id);
  const tripActions = useTripActions(id || '', refetch);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Show skeleton on initial load (no cached data yet)
  const showSkeleton = loading && !isRefreshing && !trip;

  const formatRoute = () => {
    if (!trip) return '';
    const origin = [trip.origin_city, trip.origin_state].filter(Boolean).join(', ');
    const destination = [trip.destination_city, trip.destination_state].filter(Boolean).join(', ');
    if (origin && destination) {
      return `${origin} → ${destination}`;
    }
    return origin || destination || 'No route set';
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

  // Show skeleton while loading initial data
  if (showSkeleton) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Trip Details',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />
        <ScrollView style={styles.container}>
          <TripDetailSkeleton />
        </ScrollView>
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
          <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor={colors.primary} />
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
                  <Text style={styles.infoValue}>{formatTripDate(trip.start_date)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>End Date</Text>
                  <Text style={styles.infoValue}>{formatTripDate(trip.end_date)}</Text>
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

            {/* Messages Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Messages</Text>
                <TouchableOpacity
                  onPress={() => router.push(`/(app)/trips/${trip.id}/messages`)}
                  style={styles.touchTarget}
                >
                  <Text style={styles.addLink}>View All</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.messageCard}
                onPress={() => router.push(`/(app)/trips/${trip.id}/messages`)}
              >
                <View style={styles.messageIconContainer}>
                  <Text style={styles.messageIcon}>💬</Text>
                </View>
                <View style={styles.messageContent}>
                  <Text style={styles.messageTitle}>Trip Messages</Text>
                  <Text style={styles.messageSubtitle}>Chat with your team about this trip</Text>
                </View>
              </TouchableOpacity>
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
  // Equipment Card
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
  // Messages
  messageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  messageIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageIcon: {
    fontSize: 20,
  },
  messageContent: {
    flex: 1,
  },
  messageTitle: {
    ...typography.subheadline,
    fontWeight: '600',
  },
  messageSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
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
});
