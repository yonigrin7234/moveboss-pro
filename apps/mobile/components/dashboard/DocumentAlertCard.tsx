/**
 * DocumentAlertCard Component
 *
 * Alert card showing expired documents warning.
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Icon } from '../ui';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface DocumentAlertCardProps {
  expiredCount: number;
  truckUnitNumber?: string;
  trailerUnitNumber?: string;
  onPress: () => void;
}

export function DocumentAlertCard({
  expiredCount,
  truckUnitNumber,
  trailerUnitNumber,
  onPress,
}: DocumentAlertCardProps) {
  const vehicleInfo = [truckUnitNumber, trailerUnitNumber].filter(Boolean).join(' + ');

  return (
    <Pressable style={styles.alertCard} onPress={onPress}>
      <View style={styles.alertContent}>
        <Icon name="alert-triangle" size="lg" color={colors.warning} />
        <View style={styles.alertText}>
          <Text style={styles.alertTitle}>
            {expiredCount} Document{expiredCount > 1 ? 's' : ''} Expired
          </Text>
          <Text style={styles.alertSubtitle}>
            {vehicleInfo} - Tap to view
          </Text>
        </View>
        <Icon name="chevron-right" size="md" color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  alertCard: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    ...typography.subheadline,
    color: colors.error,
  },
  alertSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});

export default DocumentAlertCard;
