/**
 * ExpenseSummaryCard Component
 *
 * Displays expense summary with total and reimbursable amounts.
 */

import { View, Text, StyleSheet } from 'react-native';

interface ExpenseSummaryCardProps {
  totalExpenses: number;
  reimbursable: number;
}

export function ExpenseSummaryCard({ totalExpenses, reimbursable }: ExpenseSummaryCardProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Total Expenses</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalExpenses)}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Reimbursable</Text>
        <Text style={[styles.summaryValue, styles.reimbursable]}>
          {formatCurrency(reimbursable)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#3a3a4e',
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  reimbursable: {
    color: '#10b981',
  },
});

export default ExpenseSummaryCard;
