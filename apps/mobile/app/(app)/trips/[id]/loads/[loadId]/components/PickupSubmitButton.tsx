import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '../../../../../../../lib/theme';

type PickupSubmitButtonProps = {
  canSubmit: boolean;
  submitting: boolean;
  uploading: boolean;
  progress: number;
  onSubmit: () => void;
  showValidationHint: boolean;
};

export function PickupSubmitButton({
  canSubmit,
  submitting,
  uploading,
  progress,
  onSubmit,
  showValidationHint,
}: PickupSubmitButtonProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Completing...' : uploading ? `Uploading... ${progress}%` : 'Complete Pickup'}
        </Text>
      </TouchableOpacity>

      {showValidationHint && (
        <Text style={styles.validationHint}>Please select a Ready-for-Delivery date</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: 18,
    alignItems: 'center',
    minHeight: 44,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  validationHint: {
    ...typography.bodySmall,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.itemGap,
  },
});

