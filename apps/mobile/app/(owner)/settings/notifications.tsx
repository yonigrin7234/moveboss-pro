/**
 * Notification Settings Screen for Owner/Dispatcher
 * Allows managing push notification preferences per notification type
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
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Lock, Smartphone, Mail, ChevronLeft, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  useNotificationSettings,
  groupSettingsByCategory,
  type NotificationType,
} from '../../../hooks/useNotificationSettings';
import { colors, typography, spacing, radius } from '../../../lib/theme';

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, isLoading, error, refresh, updateSetting } = useNotificationSettings();

  const groupedSettings = groupSettingsByCategory(settings);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleToggle = useCallback(
    async (
      notificationType: NotificationType,
      channel: 'push' | 'inApp' | 'email',
      newValue: boolean
    ) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await updateSetting(notificationType, channel, newValue);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to update setting');
      }
    },
    [updateSetting]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header onBack={handleBack} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header onBack={handleBack} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Info size={18} color={colors.info} />
          <Text style={styles.infoText}>
            Customize how you receive notifications. Required notifications cannot be turned off.
          </Text>
        </View>

        {/* Notification Categories */}
        {groupedSettings.map(({ category, label, settings: categorySettings }) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{label}</Text>
            <View style={styles.categoryCard}>
              {categorySettings.map((setting, index) => (
                <View
                  key={setting.notificationType}
                  style={[
                    styles.settingRow,
                    index < categorySettings.length - 1 && styles.settingRowBorder,
                  ]}
                >
                  {/* Setting Name & Badge */}
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{setting.label}</Text>
                    {setting.isMandatory && (
                      <View style={styles.requiredBadge}>
                        <Lock size={10} color={colors.warning} />
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>

                  {/* Channel Toggles */}
                  <View style={styles.togglesContainer}>
                    {/* Push */}
                    <View style={styles.toggleColumn}>
                      <View style={styles.toggleIconLabel}>
                        <Smartphone size={14} color={colors.textMuted} />
                      </View>
                      <Switch
                        value={setting.pushEnabled}
                        onValueChange={(value) =>
                          handleToggle(setting.notificationType, 'push', value)
                        }
                        disabled={setting.isMandatory}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.white}
                        ios_backgroundColor={colors.border}
                        style={styles.switch}
                      />
                    </View>

                    {/* In-App */}
                    <View style={styles.toggleColumn}>
                      <View style={styles.toggleIconLabel}>
                        <Bell size={14} color={colors.textMuted} />
                      </View>
                      <Switch
                        value={setting.inAppEnabled}
                        onValueChange={(value) =>
                          handleToggle(setting.notificationType, 'inApp', value)
                        }
                        disabled={setting.isMandatory}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.white}
                        ios_backgroundColor={colors.border}
                        style={styles.switch}
                      />
                    </View>

                    {/* Email */}
                    <View style={styles.toggleColumn}>
                      <View style={styles.toggleIconLabel}>
                        <Mail size={14} color={colors.textMuted} />
                      </View>
                      <Switch
                        value={setting.emailEnabled}
                        onValueChange={(value) =>
                          handleToggle(setting.notificationType, 'email', value)
                        }
                        disabled={setting.isMandatory}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.white}
                        ios_backgroundColor={colors.border}
                        style={styles.switch}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Smartphone size={14} color={colors.textMuted} />
            <Text style={styles.legendText}>Push notifications</Text>
          </View>
          <View style={styles.legendItem}>
            <Bell size={14} color={colors.textMuted} />
            <Text style={styles.legendText}>In-app alerts</Text>
          </View>
          <View style={styles.legendItem}>
            <Mail size={14} color={colors.textMuted} />
            <Text style={styles.legendText}>Email notifications</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Custom Header with Back Button
function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
        <ChevronLeft size={24} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle}>Notifications</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.button,
    color: colors.white,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.info,
    flex: 1,
    lineHeight: 20,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typography.subheadline,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  settingLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  requiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
    gap: 4,
  },
  requiredText: {
    ...typography.caption,
    color: colors.warning,
    fontSize: 11,
  },
  togglesContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  toggleColumn: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  toggleIconLabel: {
    height: 18,
    justifyContent: 'center',
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
