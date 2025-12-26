/**
 * TimelineItem Component
 *
 * Displays a single item in a load's timeline with connecting line.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../ui';
import { colors, typography, spacing } from '../../lib/theme';

interface TimelineItemProps {
  label: string;
  time: string | null;
  isLast?: boolean;
  isCompleted?: boolean;
}

export function TimelineItem({ label, time, isLast = false, isCompleted = true }: TimelineItemProps) {
  if (!time) return null;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, isCompleted && styles.timelineDotCompleted]}>
          {isCompleted && <Icon name="check" size={10} color={colors.white} />}
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
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
    minHeight: 50,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
    marginBottom: -spacing.xs,
    minHeight: 20,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  timelineLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  timelineTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});

export default TimelineItem;
