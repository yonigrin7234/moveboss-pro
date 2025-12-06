/**
 * SummaryCard Component
 *
 * Displays the pickup completion summary:
 * - Linehaul total
 * - Accessorials total
 * - Total contract value
 * - Amount collected at pickup
 * - Balance due at delivery
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface SummaryCardProps {
  linehaulTotal: number;
  accessorialsTotal: number;
  totalContract: number;
  amountCollected: number;
  remainingBalance: number;
}

export function SummaryCard({
  linehaulTotal,
  accessorialsTotal,
  totalContract,
  amountCollected,
  remainingBalance,
}: SummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View style={styles.totalCard}>
      <Text style={styles.totalTitle}>Summary</Text>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Linehaul</Text>
        <Text style={styles.totalValue}>{formatCurrency(linehaulTotal)}</Text>
      </View>
      {accessorialsTotal > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Accessorials</Text>
          <Text style={styles.totalValue}>{formatCurrency(accessorialsTotal)}</Text>
        </View>
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Contract</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalContract)}</Text>
      </View>
      {amountCollected > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Collected at Pickup</Text>
          <Text style={[styles.totalValue, styles.negativeValue]}>
            -{formatCurrency(amountCollected)}
          </Text>
        </View>
      )}
      <View style={[styles.totalRow, styles.totalRowHighlight]}>
        <Text style={styles.totalLabelBold}>Balance Due at Delivery</Text>
        <Text style={styles.totalValueLarge}>{formatCurrency(remainingBalance)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  totalCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.sectionGap,
  },
  totalTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginTop: spacing.itemGap,
    paddingTop: spacing.lg,
  },
  totalLabel: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  totalLabelBold: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  totalValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  totalValueLarge: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  negativeValue: {
    color: '#ff6b6b',
  },
});

export default SummaryCard;
