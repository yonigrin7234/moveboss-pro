import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../../../../../../lib/theme';
import type { LoadDetail } from '../types';

type LoadFinancialSectionProps = {
  load: LoadDetail;
  formatCurrency: (value: number | null) => string;
};

export function LoadFinancialSection({ load, formatCurrency }: LoadFinancialSectionProps) {
  if (!load.balance_due_on_delivery && !load.amount_collected_on_delivery) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Payment</Text>
      <View style={styles.infoGrid}>
        {load.balance_due_on_delivery && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Balance Due</Text>
            <Text style={styles.infoValueLarge}>{formatCurrency(load.balance_due_on_delivery)}</Text>
          </View>
        )}
        {load.amount_collected_on_delivery && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Collected</Text>
            <Text style={[styles.infoValueLarge, styles.collected]}>
              {formatCurrency(load.amount_collected_on_delivery)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.itemGap,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  infoItem: {
    minWidth: '45%',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  infoValueLarge: {
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  collected: {
    color: colors.success,
  },
});





