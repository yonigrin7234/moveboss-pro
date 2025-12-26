import { View, Text, StyleSheet } from 'react-native';
import { TimelineItem } from './TimelineItem';
import { Icon } from '../ui';
import { colors, typography, spacing, radius } from '../../lib/theme';
import type { LoadDetail } from '../../types';

type LoadTimelineSectionProps = {
  load: LoadDetail;
  formatDate: (value: string | null) => string | null;
};

interface TimelineStep {
  label: string;
  time: string | null;
  formattedTime: string | null;
}

export function LoadTimelineSection({ load, formatDate }: LoadTimelineSectionProps) {
  // Build timeline steps array
  const allSteps: TimelineStep[] = [
    { label: 'Accepted', time: load.accepted_at, formattedTime: formatDate(load.accepted_at) },
    { label: 'Loading Started', time: load.loading_started_at, formattedTime: formatDate(load.loading_started_at) },
    { label: 'Loading Finished', time: load.loading_finished_at, formattedTime: formatDate(load.loading_finished_at) },
    { label: 'In Transit', time: load.delivery_started_at, formattedTime: formatDate(load.delivery_started_at) },
    { label: 'Delivered', time: load.delivery_finished_at, formattedTime: formatDate(load.delivery_finished_at) },
  ];

  // Filter to only steps that have a time
  const visibleSteps = allSteps.filter(step => step.formattedTime !== null);

  // Don't render if no timeline events
  if (visibleSteps.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Icon name="clock" size={18} color={colors.primary} />
        <Text style={styles.cardTitle}>Timeline</Text>
      </View>
      <View style={styles.timeline}>
        {visibleSteps.map((step, index) => (
          <TimelineItem
            key={step.label}
            label={step.label}
            time={step.formattedTime}
            isLast={index === visibleSteps.length - 1}
            isCompleted={true}
          />
        ))}
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
  },
  timeline: {
    // Remove gap since timeline items handle their own spacing with lines
  },
});
