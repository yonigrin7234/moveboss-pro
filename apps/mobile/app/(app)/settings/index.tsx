/**
 * Driver Settings Screen
 *
 * Shows profile info, settings options, and sign out
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../providers/AuthProvider';
import { useDriverProfile } from '../../../hooks/useDriverProfile';
import { useVehicleDocuments } from '../../../hooks/useVehicleDocuments';
import { Icon } from '../../../components/ui/Icon';
import { Logo } from '../../../components/ui/Logo';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';

export default function DriverSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { fullName, driver } = useDriverProfile();
  const { company } = useVehicleDocuments();

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            signOut();
          },
        },
      ]
    );
  }, [signOut]);

  // Get initials for avatar
  const getInitials = () => {
    if (!driver) return 'D';
    const first = driver.first_name?.charAt(0) || '';
    const last = driver.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || 'D';
  };

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
        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{fullName || 'Driver'}</Text>
            {company?.name && (
              <Text style={styles.profileCompany}>{company.name}</Text>
            )}
            {driver?.email && (
              <Text style={styles.profileEmail}>{driver.email}</Text>
            )}
          </View>
        </View>

        {/* Settings Items */}
        <Text style={styles.sectionTitle}>Preferences</Text>

        <Pressable
          style={styles.settingsItem}
          onPress={() => router.push('/(app)/settings/notifications')}
        >
          <View style={styles.itemIcon}>
            <Icon name="bell" size="md" color={colors.primary} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemLabel}>Notifications</Text>
            <Text style={styles.itemDescription}>Manage push notification preferences</Text>
          </View>
          <Icon name="chevron-right" size="sm" color={colors.textMuted} />
        </Pressable>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.aboutCard}>
          <View style={styles.aboutLogoRow}>
            <Logo size={40} />
            <View style={styles.aboutInfo}>
              <View style={styles.aboutNameRow}>
                <Text style={styles.aboutName}>MoveBoss</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proText}>PRO</Text>
                </View>
              </View>
              <Text style={styles.aboutVersion}>Driver App v1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <Pressable
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Icon name="log-out" size="md" color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
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
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  profileCompany: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  profileEmail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // Section Title
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  // Settings Item
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
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
  // About Card
  aboutCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  aboutLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutInfo: {
    marginLeft: spacing.md,
  },
  aboutNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aboutName: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  proBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.xs,
  },
  proText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  aboutVersion: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorSoft,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  signOutText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.error,
  },
});
