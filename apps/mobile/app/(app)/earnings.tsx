import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { useDriverEarnings } from '../../hooks/useDriverEarnings';
import { TripSettlement, SettlementStatus } from '../../types';

const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  pending: 'Pending',
  review: 'In Review',
  approved: 'Approved',
  paid: 'Paid',
};

const SETTLEMENT_STATUS_COLORS: Record<SettlementStatus, string> = {
  pending: colors.warning,
  review: colors.info,
  approved: colors.success,
  paid: colors.textMuted,
};

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

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Earnings' }} />
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.screenPadding }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.primaryCard]}>
            <Text style={styles.summaryLabel}>Total Earned</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalEarned)}</Text>
            <Text style={styles.summarySubtext}>{summary.tripsCompleted} trips completed</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.halfCard]}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={[styles.summaryValue, styles.pendingValue]}>
                {formatCurrency(summary.pendingPay)}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.halfCard]}>
              <Text style={styles.summaryLabel}>Paid Out</Text>
              <Text style={[styles.summaryValue, styles.paidValue]}>
                {formatCurrency(summary.paidOut)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.totalMiles.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Miles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.totalCuft.toLocaleString()}</Text>
            <Text style={styles.statLabel}>CUFT</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.tripsCompleted}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'pending', 'paid'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, selectedFilter === filter && styles.filterTabActive]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === filter && styles.filterTabTextActive,
                ]}
              >
                {filter === 'all' ? 'All' : filter === 'pending' ? 'Pending' : 'Paid'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Settlements List */}
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

function SettlementCard({
  settlement,
  onPress,
}: {
  settlement: TripSettlement;
  onPress: () => void;
}) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getPayModeLabel = () => {
    switch (settlement.payMode) {
      case 'per_mile':
        return `$${settlement.ratePerMile?.toFixed(2)}/mi`;
      case 'per_cuft':
        return `$${settlement.ratePerCuft?.toFixed(2)}/cuft`;
      case 'per_mile_and_cuft':
        return 'Mile + CUFT';
      case 'percent_of_revenue':
        return `${settlement.percentOfRevenue}% rev`;
      case 'flat_daily_rate':
        return `$${settlement.flatDailyRate?.toFixed(0)}/day`;
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity style={styles.settlementCard} onPress={onPress}>
      <View style={styles.settlementHeader}>
        <View>
          <Text style={styles.tripNumber}>Trip #{settlement.tripNumber}</Text>
          <Text style={styles.tripRoute}>{settlement.route}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: SETTLEMENT_STATUS_COLORS[settlement.settlementStatus] + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: SETTLEMENT_STATUS_COLORS[settlement.settlementStatus] },
            ]}
          >
            {SETTLEMENT_STATUS_LABELS[settlement.settlementStatus]}
          </Text>
        </View>
      </View>

      <View style={styles.settlementDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>
            {formatDate(settlement.startDate)}
            {settlement.endDate && settlement.startDate !== settlement.endDate
              ? ` - ${formatDate(settlement.endDate)}`
              : ''}
          </Text>
        </View>
        {settlement.totalMiles && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Miles</Text>
            <Text style={styles.detailValue}>{settlement.totalMiles.toLocaleString()}</Text>
          </View>
        )}
        {settlement.totalCuft && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>CUFT</Text>
            <Text style={styles.detailValue}>{settlement.totalCuft.toLocaleString()}</Text>
          </View>
        )}
        {settlement.payMode && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rate</Text>
            <Text style={styles.detailValue}>{getPayModeLabel()}</Text>
          </View>
        )}
      </View>

      <View style={styles.settlementFooter}>
        <View style={styles.payBreakdown}>
          <View style={styles.payItem}>
            <Text style={styles.payLabel}>Gross</Text>
            <Text style={styles.payAmount}>{formatCurrency(settlement.grossPay)}</Text>
          </View>
          {settlement.reimbursableExpenses > 0 && (
            <View style={styles.payItem}>
              <Text style={styles.payLabel}>+ Reimb</Text>
              <Text style={[styles.payAmount, styles.positiveAmount]}>
                {formatCurrency(settlement.reimbursableExpenses)}
              </Text>
            </View>
          )}
          {settlement.cashCollected > 0 && (
            <View style={styles.payItem}>
              <Text style={styles.payLabel}>- Cash</Text>
              <Text style={[styles.payAmount, styles.negativeAmount]}>
                {formatCurrency(settlement.cashCollected)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.netPay}>
          <Text style={styles.netPayLabel}>Net Pay</Text>
          <Text style={styles.netPayAmount}>{formatCurrency(settlement.netPay)}</Text>
        </View>
      </View>

      {settlement.settlementStatus === 'paid' && settlement.paidAt && (
        <View style={styles.paidInfo}>
          <Text style={styles.paidInfoText}>
            Paid {formatDate(settlement.paidAt)}
            {settlement.paidMethod ? ` via ${settlement.paidMethod}` : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
  // Summary
  summaryGrid: {
    marginBottom: spacing.sectionGap,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
  },
  primaryCard: {
    marginBottom: spacing.itemGap,
    backgroundColor: colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.itemGap,
  },
  halfCard: {
    flex: 1,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  summarySubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  pendingValue: {
    color: colors.warning,
    fontSize: 22,
  },
  paidValue: {
    color: colors.success,
    fontSize: 22,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.subheadline,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  // Filter
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.xs,
    marginBottom: spacing.sectionGap,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
    minHeight: 44,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.textPrimary,
  },
  // Section
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.itemGap,
  },
  // Settlement Card
  settlementCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.itemGap,
  },
  settlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.itemGap,
  },
  tripNumber: {
    ...typography.subheadline,
    color: colors.textPrimary,
  },
  tripRoute: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  settlementDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.itemGap,
    marginBottom: spacing.itemGap,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  settlementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.itemGap,
  },
  payBreakdown: {
    gap: spacing.xs,
  },
  payItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  payLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 50,
  },
  payAmount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  positiveAmount: {
    color: colors.success,
  },
  negativeAmount: {
    color: colors.error,
  },
  netPay: {
    alignItems: 'flex-end',
  },
  netPayLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  netPayAmount: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  paidInfo: {
    marginTop: spacing.itemGap,
    paddingTop: spacing.itemGap,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  paidInfoText: {
    ...typography.caption,
    color: colors.success,
    textAlign: 'center',
  },
  // Empty/Error states
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
