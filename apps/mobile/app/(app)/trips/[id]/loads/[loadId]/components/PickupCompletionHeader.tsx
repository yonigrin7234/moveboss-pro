import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../../../../../../lib/theme';

type PickupCompletionHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PickupCompletionHeader({ title, subtitle }: PickupCompletionHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.sectionGap,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

