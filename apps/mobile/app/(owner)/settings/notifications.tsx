/**
 * Notification Settings Screen
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../../lib/theme';

export default function NotificationSettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Notification Settings</Text>
      <Text style={styles.subtext}>Coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenPadding,
  },
  text: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  subtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
