/**
 * SettlementCard Component
 *
 * Card showing trip settlement details with pay breakdown.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/theme';
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

interface SettlementCardProps {
  settlement: TripSettlement;
  onPress: () => void;
}

export function SettlementCard({ settlement, onPress }: SettlementCardProps) {
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
});

export default SettlementCard;
