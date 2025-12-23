/**
 * Settings Screen - Owner/Dispatcher settings hub
 * Central place for app preferences and account management
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useOwner } from '../../../providers/OwnerProvider';
import { Icon, IconName } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';

interface SettingsItem {
  icon: IconName;
  label: string;
  description: string;
  route?: string;
  action?: () => void;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { company, role } = useOwner();

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleSupport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:support@moveboss.com?subject=MoveBoss Pro Support');
  }, []);

  const settingsGroups: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Preferences',
      items: [
        {
          icon: 'bell',
          label: 'Notifications',
          description: 'Manage push notification preferences',
          route: '/(owner)/settings/notifications',
        },
      ],
    },
    {
      title: 'Company',
      items: [
        {
          icon: 'building',
          label: 'Company Info',
          description: company?.name || 'View company details',
          route: '/(owner)/settings/company',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle',
          label: 'Help & Support',
          description: 'Get help or contact support',
          action: handleSupport,
        },
        {
          icon: 'info',
          label: 'About',
          description: 'App version and legal information',
          route: '/(owner)/settings/about',
        },
      ],
    },
  ];

  const handleItemPress = useCallback((item: SettingsItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route as any);
    }
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Icon name="user" size="lg" color={colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{company?.name || 'Your Company'}</Text>
            <Text style={styles.userRole}>
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member'}
            </Text>
          </View>
        </View>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, itemIndex) => (
                <Pressable
                  key={itemIndex}
                  style={[
                    styles.settingsItem,
                    itemIndex < group.items.length - 1 && styles.settingsItemBorder,
                  ]}
                  onPress={() => handleItemPress(item)}
                >
                  <View style={styles.itemIcon}>
                    <Icon name={item.icon} size="md" color={colors.primary} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemDescription} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size="md" color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Version Info */}
        <Text style={styles.versionText}>MoveBoss Pro v1.0.0</Text>
      </ScrollView>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  userRole: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xxs,
  },
  settingsGroup: {
    marginBottom: spacing.lg,
  },
  groupTitle: {
    ...typography.subheadline,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingsItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
    marginRight: spacing.sm,
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
  versionText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
