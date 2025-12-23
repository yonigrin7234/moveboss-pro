/**
 * ExpenseSummaryCard Component
 *
 * Premium expense summary with total, reimbursable, and category breakdown.
 * Matches the earnings hero card style.
 */

import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { Icon, IconName } from '../ui/Icon';

interface ExpenseSummaryCardProps {
  totalExpenses: number;
  reimbursable: number;
  categoryTotals?: Record<string, number>;
  expenseCount?: number;
}

const CATEGORY_CONFIG: Record<string, { icon: IconName; label: string }> = {
  fuel: { icon: 'fuel', label: 'Fuel' },
  tolls: { icon: 'credit-card', label: 'Tolls' },
  lumper: { icon: 'package', label: 'Lumper' },
  parking: { icon: 'map-pin', label: 'Parking' },
  maintenance: { icon: 'tool', label: 'Maintenance' },
  other: { icon: 'more-horizontal', label: 'Other' },
};

export function ExpenseSummaryCard({
  totalExpenses,
  reimbursable,
  categoryTotals,
  expenseCount = 0,
}: ExpenseSummaryCardProps) {
  const formatCurrency = (amount: number) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Get top categories for display
  const topCategories = categoryTotals
    ? Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : [];

  return (
    <View style={styles.container}>
      {/* Main Summary Card */}
      <LinearGradient
        colors={[colors.surface, colors.surfaceElevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mainCard}
      >
        <View style={styles.row}>
          {/* Total Expenses */}
          <View style={styles.statBlock}>
            <View style={styles.statHeader}>
              <Icon name="receipt" size="sm" color={colors.textMuted} />
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
            <Text style={styles.totalValue}>{formatCurrency(totalExpenses)}</Text>
            <Text style={styles.statSubtext}>
              {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Reimbursable */}
          <View style={styles.statBlock}>
            <View style={styles.statHeader}>
              <Icon name="dollar" size="sm" color={colors.success} />
              <Text style={styles.statLabel}>Reimbursable</Text>
            </View>
            <Text style={[styles.totalValue, styles.reimbursableValue]}>
              {formatCurrency(reimbursable)}
            </Text>
            <Text style={styles.statSubtext}>
              {reimbursable > 0 ? 'Due to driver' : 'None pending'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Category Breakdown */}
      {topCategories.length > 0 && (
        <View style={styles.categoriesCard}>
          <Text style={styles.categoriesTitle}>Top Categories</Text>
          <View style={styles.categoriesList}>
            {topCategories.map(([category, amount]) => {
              const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
              const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;

              return (
                <View key={category} style={styles.categoryItem}>
                  <View style={styles.categoryIcon}>
                    <Icon name={config.icon} size="sm" color={colors.primary} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryLabel}>{config.label}</Text>
                    <View style={styles.categoryBar}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          { width: `${percentage}%` }
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  mainCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  row: {
    flexDirection: 'row',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  totalValue: {
    ...typography.numeric,
    color: colors.textPrimary,
    fontSize: 28,
  },
  reimbursableValue: {
    color: colors.success,
  },
  statSubtext: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xxs,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  // Categories Card
  categoriesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadows.sm,
  },
  categoriesTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  categoriesList: {
    gap: spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: spacing.xxs,
  },
  categoryBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  categoryAmount: {
    ...typography.subheadline,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default ExpenseSummaryCard;
