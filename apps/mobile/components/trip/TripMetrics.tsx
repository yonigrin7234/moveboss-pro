/**
 * TripMetrics Component
 *
 * Displays quick-scan metric pills for trip stats:
 * - Miles driven
 * - Cubic feet hauled
 * - Loads progress (delivered/total)
 * - Collections made
 *
 * Inspired by the owner dashboard's metric pills.
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, IconName } from '../ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

interface TripMetricsProps {
  miles: number | null;
  totalCuft: number | null;
  loadsDelivered: number;
  loadsTotal: number;
  totalCollected: number | null;
  onLoadsPress?: () => void;
}

interface MetricPillProps {
  icon: IconName;
  value: string | number;
  label: string;
  highlight?: boolean;
  onPress?: () => void;
}

function MetricPill({ icon, value, label, highlight, onPress }: MetricPillProps) {
  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const content = (
    <View style={[styles.metricPill, highlight && styles.metricPillHighlight]}>
      <Icon name={icon} size="sm" color={highlight ? colors.success : colors.textMuted} />
      <Text style={[styles.metricValue, highlight && styles.metricValueHighlight]}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={handlePress} style={styles.metricPillWrapper}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.metricPillWrapper}>{content}</View>;
}

export function TripMetrics({
  miles,
  totalCuft,
  loadsDelivered,
  loadsTotal,
  totalCollected,
  onLoadsPress,
}: TripMetricsProps) {
  const formatMiles = (m: number | null) => {
    if (!m) return '—';
    if (m >= 1000) return `${(m / 1000).toFixed(1)}k`;
    return m.toString();
  };

  const formatCuft = (c: number | null) => {
    if (!c) return '—';
    if (c >= 1000) return `${(c / 1000).toFixed(1)}k`;
    return c.toString();
  };

  const formatCollected = (c: number | null) => {
    if (!c) return '$0';
    if (c >= 10000) return `$${(c / 1000).toFixed(1)}k`;
    if (c >= 1000) return `$${(c / 1000).toFixed(1)}k`;
    return `$${c.toFixed(0)}`;
  };

  const allLoadsDelivered = loadsTotal > 0 && loadsDelivered === loadsTotal;

  return (
    <View style={styles.container}>
      <View style={styles.metricsRow}>
        <MetricPill
          icon="map"
          value={formatMiles(miles)}
          label="Miles"
        />
        <MetricPill
          icon="box"
          value={formatCuft(totalCuft)}
          label="CUFT"
        />
        <MetricPill
          icon="package"
          value={`${loadsDelivered}/${loadsTotal}`}
          label="Loads"
          highlight={allLoadsDelivered}
          onPress={onLoadsPress}
        />
        <MetricPill
          icon="dollar"
          value={formatCollected(totalCollected)}
          label="Collected"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricPillWrapper: {
    flex: 1,
  },
  metricPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricPillHighlight: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success + '40',
  },
  metricValue: {
    ...typography.headline,
    color: colors.textPrimary,
    fontSize: 16,
  },
  metricValueHighlight: {
    color: colors.success,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default TripMetrics;
