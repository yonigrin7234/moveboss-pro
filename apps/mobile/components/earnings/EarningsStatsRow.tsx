/**
 * EarningsStatsRow Component
 *
 * Row showing total miles, CUFT, and trips.
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface EarningsStatsRowProps {
  totalMiles: number;
  totalCuft: number;
  tripsCompleted: number;
}

export function EarningsStatsRow({ totalMiles, totalCuft, tripsCompleted }: EarningsStatsRowProps) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalMiles.toLocaleString()}</Text>
        <Text style={styles.statLabel}>Miles</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalCuft.toLocaleString()}</Text>
        <Text style={styles.statLabel}>CUFT</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{tripsCompleted}</Text>
        <Text style={styles.statLabel}>Trips</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});

export default EarningsStatsRow;
