/**
 * Driver Settings Screen
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ChevronRight } from 'lucide-react-native';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';

interface SettingsItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  route: string;
}

export default function DriverSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const settings: SettingsItem[] = [
    {
      icon: <Bell size={24} color={colors.primary} />,
      label: 'Notifications',
      description: 'Manage push notification preferences',
      route: '/(app)/settings/notifications',
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        {settings.map((item, index) => (
          <Pressable
            key={index}
            style={styles.settingsItem}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.itemIcon}>{item.icon}</View>
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </>
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
