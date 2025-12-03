/**
 * QuickStats - Compact stats row for dashboard
 *
 * Shows 3 key metrics in a horizontal layout:
 * - Today's earnings
 * - Miles driven
 * - Loads completed
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface QuickStatsProps {
  earnings: number;
  miles: number;
  loadsCompleted: number;
  loadsTotal?: number;
}

export function QuickStats({
  earnings,
  miles,
  loadsCompleted,
  loadsTotal,
}: QuickStatsProps) {
  return (
    <View style={styles.container}>
      <StatItem
        label="Today's Earnings"
        value={`$${earnings.toLocaleString()}`}
        color={colors.success}
      />
      <View style={styles.divider} />
      <StatItem
        label="Miles"
        value={miles.toLocaleString()}
        color={colors.primary}
      />
      <View style={styles.divider} />
      <StatItem
        label="Loads"
        value={loadsTotal ? `${loadsCompleted}/${loadsTotal}` : loadsCompleted.toString()}
        color={colors.info}
      />
    </View>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  color: string;
}

function StatItem({ label, value, color }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={[styles.indicator, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  statValue: {
    ...typography.numeric,
    color: colors.textPrimary,
    fontSize: 22,
    marginBottom: spacing.xxs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  indicator: {
    position: 'absolute',
    bottom: -spacing.lg,
    width: 24,
    height: 3,
    borderRadius: 1.5,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});

export default QuickStats;
