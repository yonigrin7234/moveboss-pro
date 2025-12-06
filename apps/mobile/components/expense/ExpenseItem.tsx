/**
 * ExpenseItem Component
 *
 * Individual expense row with category, amount, and reimbursable badge.
 * Long-press to delete.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TripExpense } from '../../types';

interface ExpenseItemProps {
  expense: TripExpense;
  onLongPress: () => void;
}

export function ExpenseItem({ expense, onLongPress }: ExpenseItemProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isReimbursable = expense.paid_by === 'driver_personal' || expense.paid_by === 'driver_cash';

  return (
    <TouchableOpacity
      style={styles.expenseItem}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.expenseLeft}>
        <View style={styles.expenseHeader}>
          <Text style={styles.expenseCategory}>
            {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
          </Text>
          {isReimbursable && (
            <View style={styles.reimbursableBadge}>
              <Text style={styles.reimbursableBadgeText}>Reimbursable</Text>
            </View>
          )}
        </View>
        {expense.description && (
          <Text style={styles.expenseDescription}>{expense.description}</Text>
        )}
        <Text style={styles.expenseDate}>{formatDate(expense.incurred_at)}</Text>
      </View>
      <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a4e',
  },
  expenseLeft: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseCategory: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  reimbursableBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reimbursableBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  expenseAmount: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ExpenseItem;
