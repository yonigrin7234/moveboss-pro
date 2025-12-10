import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, typography, spacing, radius } from '../../../../../../../lib/theme';

type PickupLoadingSummaryProps = {
  actualCuft: number;
  startPhoto?: string | null;
  endPhoto?: string | null;
};

export function PickupLoadingSummary({ actualCuft, startPhoto, endPhoto }: PickupLoadingSummaryProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Loading Summary</Text>
      <Text style={styles.sectionSubtitle}>Captured during loading</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Actual CUFT Loaded</Text>
          <Text style={styles.summaryValueLarge}>{actualCuft.toLocaleString()}</Text>
        </View>
      </View>

      {(startPhoto || endPhoto) && (
        <View style={styles.photoThumbnails}>
          {startPhoto && (
            <View style={styles.thumbnailContainer}>
              <Text style={styles.thumbnailLabel}>Start</Text>
              <Image source={{ uri: startPhoto }} style={styles.thumbnail} />
            </View>
          )}
          {endPhoto && (
            <View style={styles.thumbnailContainer}>
              <Text style={styles.thumbnailLabel}>End</Text>
              <Image source={{ uri: endPhoto }} style={styles.thumbnail} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  summaryValueLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.success,
  },
  photoThumbnails: {
    flexDirection: 'row',
    gap: spacing.itemGap,
    marginTop: spacing.itemGap,
  },
  thumbnailContainer: {
    alignItems: 'center',
  },
  thumbnailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
  },
});


