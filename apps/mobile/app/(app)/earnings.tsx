/**
 * Earnings Screen
 *
 * View driver earnings and trip settlements.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../lib/theme';
import { useDriverEarnings } from '../../hooks/useDriverEarnings';
import {
  SettlementCard,
  EarningsSummary,
  EarningsStatsRow,
  EarningsFilterTabs,
} from '../../components/earnings';
import { ErrorState } from '../../components/ui';

export default function EarningsScreen() {
  const { settlements, summary, loading, error, refetch } = useDriverEarnings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const filteredSettlements = settlements.filter((s) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') return s.settlementStatus !== 'paid';
    if (selectedFilter === 'paid') return s.settlementStatus === 'paid';
    return true;
  });

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Earnings' }} />
        <View style={styles.container}>
          <ErrorState title="Unable to load earnings" message={error} actionLabel="Retry" onAction={refetch} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Earnings',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.screenPadding }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <EarningsSummary
          totalEarned={summary.totalEarned}
          tripsCompleted={summary.tripsCompleted}
          pendingPay={summary.pendingPay}
          paidOut={summary.paidOut}
        />

        <EarningsStatsRow
          totalMiles={summary.totalMiles}
          totalCuft={summary.totalCuft}
          tripsCompleted={summary.tripsCompleted}
        />

        <EarningsFilterTabs
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Settlements</Text>
          {filteredSettlements.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {selectedFilter === 'all'
                  ? 'No completed trips yet'
                  : selectedFilter === 'pending'
                  ? 'No pending settlements'
                  : 'No paid settlements'}
              </Text>
            </View>
          ) : (
            filteredSettlements.map((settlement) => (
              <SettlementCard
                key={settlement.tripId}
                settlement={settlement}
                onPress={() => router.push(`/(app)/trips/${settlement.tripId}`)}
              />
            ))
          )}
        </View>
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
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.itemGap,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
