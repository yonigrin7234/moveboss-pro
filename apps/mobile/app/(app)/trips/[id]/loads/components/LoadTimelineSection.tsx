import { View, Text, StyleSheet } from 'react-native';
import { TimelineItem } from '../../../../../../components/load';
import { colors, typography, spacing, radius } from '../../../../../../lib/theme';
import type { LoadDetail } from '../types';

type LoadTimelineSectionProps = {
  load: LoadDetail;
  formatDate: (value: string | null) => string | null;
};

export function LoadTimelineSection({ load, formatDate }: LoadTimelineSectionProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Timeline</Text>
      <View style={styles.timeline}>
        <TimelineItem label="Accepted" time={formatDate(load.accepted_at)} />
        <TimelineItem label="Loading Started" time={formatDate(load.loading_started_at)} />
        <TimelineItem label="Loading Finished" time={formatDate(load.loading_finished_at)} />
        <TimelineItem label="In Transit" time={formatDate(load.delivery_started_at)} />
        <TimelineItem label="Delivered" time={formatDate(load.delivery_finished_at)} />
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
  timeline: {
    gap: spacing.lg,
  },
});





