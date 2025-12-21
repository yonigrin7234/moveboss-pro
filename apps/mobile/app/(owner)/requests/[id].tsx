/**
 * Request Detail Screen - View and respond to a specific load request
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing } from '../../../lib/theme';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Request Detail: {id}</Text>
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
