/**
 * Settings Screen
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';

interface SettingsItem {
  icon: IconName;
  label: string;
  description: string;
  route: string;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const settings: SettingsItem[] = [
    {
      icon: 'bell',
      label: 'Notifications',
      description: 'Manage notification preferences',
      route: '/(owner)/settings/notifications',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {settings.map((item, index) => (
        <Pressable
          key={index}
          style={styles.settingsItem}
          onPress={() => router.push(item.route as any)}
        >
          <View style={styles.itemIcon}>
            <Icon name={item.icon} size="md" color={colors.primary} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </View>
          <Icon name="chevron-right" size="md" color={colors.textMuted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenPadding,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
});
