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
import { useDriverEarnings } from '../../hooks/useDriverEarnings';
import { TripSettlement, SettlementStatus } from '../../types';

const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  pending: 'Pending',
  review: 'In Review',
  approved: 'Approved',
  paid: 'Paid',
};

const SETTLEMENT_STATUS_COLORS: Record<SettlementStatus, string> = {
  pending: '#f59e0b',
  review: '#3b82f6',
  approved: '#10b981',
  paid: '#6b7280',
};

export default function EarningsScreen() {
  const { settlements, summary, loading, error, refetch } = useDriverEarnings();
  const router = useRouter();
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
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  // Summary
  summaryGrid: {
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 20,
  },
  primaryCard: {
    marginBottom: 12,
    backgroundColor: '#0066CC',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  summarySubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  pendingValue: {
    color: '#f59e0b',
    fontSize: 22,
  },
  paidValue: {
    color: '#10b981',
    fontSize: 22,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#3a3a4e',
  },
  // Filter
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#0066CC',
  },
  filterTabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  // Settlement Card
  settlementCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  tripRoute: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settlementDetails: {
    borderTopWidth: 1,
    borderTopColor: '#3a3a4e',
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#888',
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
  },
  settlementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#3a3a4e',
    paddingTop: 12,
  },
  payBreakdown: {
    gap: 4,
  },
  payItem: {
    flexDirection: 'row',
    gap: 8,
  },
  payLabel: {
    fontSize: 12,
    color: '#888',
    width: 50,
  },
  payAmount: {
    fontSize: 12,
    color: '#ccc',
  },
  positiveAmount: {
    color: '#10b981',
  },
  negativeAmount: {
    color: '#ef4444',
  },
  netPay: {
    alignItems: 'flex-end',
  },
  netPayLabel: {
    fontSize: 12,
    color: '#888',
  },
  netPayAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  paidInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3a4e',
  },
  paidInfoText: {
    fontSize: 12,
    color: '#10b981',
    textAlign: 'center',
  },
  // Empty/Error states
  emptyCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
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
