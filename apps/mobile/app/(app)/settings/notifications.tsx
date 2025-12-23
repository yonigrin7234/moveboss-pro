/**
 * Driver Notification Settings Screen
 * Simplified view for drivers to manage their push notification preferences
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Lock, Smartphone } from 'lucide-react-native';
import {
  useNotificationSettings,
  groupSettingsByCategory,
  type NotificationType,
} from '../../../hooks/useNotificationSettings';
import { colors, typography, spacing, radius } from '../../../lib/theme';

export default function DriverNotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, isLoading, error, refresh, updateSetting } = useNotificationSettings();

  const groupedSettings = groupSettingsByCategory(settings);

  const handleToggle = useCallback(
    async (notificationType: NotificationType, newValue: boolean) => {
      const result = await updateSetting(notificationType, 'push', newValue);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to update setting');
      }
    },
    [updateSetting]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Notifications',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Notifications',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* Header Info */}
        <View style={styles.infoCard}>
          <Smartphone size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Choose which push notifications you want to receive on your device.
          </Text>
        </View>

        {/* Notification Categories */}
        {groupedSettings.map(({ category, label, settings: categorySettings }) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{label}</Text>

            {categorySettings.map((setting) => (
              <View key={setting.notificationType} style={styles.settingCard}>
                <View style={styles.settingContent}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{setting.label}</Text>
                    {setting.isMandatory && (
                      <View style={styles.mandatoryBadge}>
                        <Lock size={10} color={colors.warning} />
                        <Text style={styles.mandatoryText}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Switch
                    value={setting.pushEnabled}
                    onValueChange={(value) => handleToggle(setting.notificationType, value)}
                    disabled={setting.isMandatory}
                    trackColor={{ false: colors.border, true: colors.primarySoft }}
                    thumbColor={setting.pushEnabled ? colors.primary : colors.textMuted}
                  />
                </View>
              </View>
            ))}
          </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    ...typography.caption,
    color: colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  mandatoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
    gap: 4,
  },
  mandatoryText: {
    ...typography.caption,
    color: colors.warning,
    fontSize: 11,
  },
});
