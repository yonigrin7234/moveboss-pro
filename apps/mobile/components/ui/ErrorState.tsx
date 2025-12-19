import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface ErrorStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, actionLabel, onAction }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.xs,
  },
  title: {
    ...typography.headline,
    color: colors.error,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default ErrorState;









