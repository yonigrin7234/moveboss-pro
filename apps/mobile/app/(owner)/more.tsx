/**
 * More Screen - Settings and additional options
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../providers/AuthProvider';
import { useOwner } from '../../providers/OwnerProvider';
import { Icon, IconName } from '../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

interface MenuItem {
  icon: IconName;
  label: string;
  description?: string;
  route?: string;
  action?: () => void;
  danger?: boolean;
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { company, role } = useOwner();

  const menuItems: MenuItem[] = [
    {
      icon: 'truck',
      label: 'Trips',
      description: 'Manage trips and assignments',
      route: '/(owner)/trips',
    },
    {
      icon: 'users',
      label: 'Drivers',
      description: 'View and manage drivers',
      route: '/(owner)/drivers',
    },
    {
      icon: 'settings',
      label: 'Settings',
      description: 'App settings and preferences',
      route: '/(owner)/settings',
    },
  ];

  const handlePress = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Company Info */}
        <View style={styles.companyCard}>
          <View style={styles.companyIcon}>
            <Icon name="truck" size="lg" color={colors.primary} />
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>
              {company?.name}
            </Text>
            <Text style={styles.companyRole}>
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member'}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              style={[
                styles.menuItem,
                item.danger && styles.menuItemDanger,
              ]}
              onPress={() => handlePress(item)}
            >
              <View style={[
                styles.menuIcon,
                item.danger && styles.menuIconDanger,
              ]}>
                <Icon
                  name={item.icon}
                  size="md"
                  color={item.danger ? colors.error : colors.primary}
                />
              </View>
              <View style={styles.menuContent}>
                <Text style={[
                  styles.menuLabel,
                  item.danger && styles.menuLabelDanger,
                ]}>
                  {item.label}
                </Text>
                {item.description && (
                  <Text style={styles.menuDescription}>{item.description}</Text>
                )}
              </View>
              <Icon name="chevron-right" size="md" color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Sign Out */}
        <Pressable style={styles.signOutButton} onPress={signOut}>
          <Icon name="log-out" size="md" color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

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
    padding: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.screenPadding,
    paddingTop: 0,
    paddingBottom: spacing.xxxl + 80,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  companyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  companyRole: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xxs,
  },
  menuSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemDanger: {},
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIconDanger: {
    backgroundColor: colors.errorSoft,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuLabelDanger: {
    color: colors.error,
  },
  menuDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorSoft,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
  },
  signOutText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.error,
  },
  versionText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
