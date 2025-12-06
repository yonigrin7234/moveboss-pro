/**
 * TimelineItem Component
 *
 * Displays a single item in a load's timeline.
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../lib/theme';

interface TimelineItemProps {
  label: string;
  time: string | null;
}

export function TimelineItem({ label, time }: TimelineItemProps) {
  if (!time) return null;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot} />
      <View style={styles.timelineContent}>
        <Text style={styles.timelineLabel}>{label}</Text>
        <Text style={styles.timelineTime}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.itemGap,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },
  timelineContent: {},
  timelineLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  timelineTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default TimelineItem;
