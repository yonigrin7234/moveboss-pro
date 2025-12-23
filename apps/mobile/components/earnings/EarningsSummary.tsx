/**
 * EarningsSummary Component
 *
 * Summary cards showing total earned, pending, and paid amounts.
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface EarningsSummaryProps {
  totalEarned: number;
  tripsCompleted: number;
  pendingPay: number;
  paidOut: number;
}

export function EarningsSummary({
  totalEarned,
  tripsCompleted,
  pendingPay,
  paidOut,
}: EarningsSummaryProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <View style={styles.summaryGrid}>
      <View style={[styles.summaryCard, styles.primaryCard]}>
        <Text style={styles.primaryCardLabel}>Total Earned</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalEarned)}</Text>
        <Text style={styles.primaryCardSubtext}>{tripsCompleted} trips completed</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.halfCard]}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, styles.pendingValue]}>
            {formatCurrency(pendingPay)}
          </Text>
        </View>
        <View style={[styles.summaryCard, styles.halfCard]}>
          <Text style={styles.summaryLabel}>Paid Out</Text>
          <Text style={[styles.summaryValue, styles.paidValue]}>
            {formatCurrency(paidOut)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  // White text for labels on blue primary card
  primaryCardLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
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
  // White text for subtext on blue primary card
  primaryCardSubtext: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
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
});

export default EarningsSummary;
