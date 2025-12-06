/**
 * ContractSummaryCard Component
 *
 * Displays contract summary for contract details screen:
 * - Linehaul total
 * - Accessorials total
 * - Total revenue
 * - Balance driver collects
 * - Amount company owes
 */

import { View, Text, StyleSheet } from 'react-native';

interface ContractSummaryCardProps {
  linehaulTotal: number;
  accessorialsTotal: number;
  totalRevenue: number;
  balanceDue: number;
  amountCompanyOwes: number;
}

export function ContractSummaryCard({
  linehaulTotal,
  accessorialsTotal,
  totalRevenue,
  balanceDue,
  amountCompanyOwes,
}: ContractSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Summary</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Linehaul</Text>
        <Text style={styles.summaryValue}>{formatCurrency(linehaulTotal)}</Text>
      </View>
      {accessorialsTotal > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Accessorials</Text>
          <Text style={styles.summaryValue}>{formatCurrency(accessorialsTotal)}</Text>
        </View>
      )}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total Revenue</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Balance Driver Collects</Text>
        <Text style={[styles.summaryValue, styles.negativeValue]}>
          -{formatCurrency(balanceDue)}
        </Text>
      </View>
      <View style={[styles.summaryRow, styles.summaryRowHighlight]}>
        <Text style={styles.summaryLabelBold}>Amount Company Owes You</Text>
        <Text style={styles.summaryValueLarge}>
          {formatCurrency(amountCompanyOwes)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#0066CC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginTop: 12,
    paddingTop: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  summaryValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  summaryValueLarge: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
  },
  negativeValue: {
    color: '#ff6b6b',
  },
});

export default ContractSummaryCard;
