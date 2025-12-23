/**
 * About Screen
 * App version and legal information
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '../../../components/ui/Icon';
import { Logo } from '../../../components/ui/Logo';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleOpenLink = useCallback((url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  }, []);

  const legalLinks = [
    { label: 'Terms of Service', url: 'https://moveboss.com/terms' },
    { label: 'Privacy Policy', url: 'https://moveboss.com/privacy' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo & Info */}
        <View style={styles.appSection}>
          <Logo size={80} />
          <Text style={styles.appName}>MoveBoss Pro</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appTagline}>
            Professional trucking management made simple
          </Text>
        </View>

        {/* App Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Version</Text>
            <Text style={styles.detailValue}>1.0.0</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowBorder]}>
            <Text style={styles.detailLabel}>Build</Text>
            <Text style={styles.detailValue}>2024.12.22</Text>
          </View>
        </View>

        {/* Legal Links */}
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.linksCard}>
          {legalLinks.map((link, index) => (
            <Pressable
              key={index}
              style={[
                styles.linkRow,
                index < legalLinks.length - 1 && styles.linkRowBorder,
              ]}
              onPress={() => handleOpenLink(link.url)}
            >
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Icon name="external-link" size="sm" color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Copyright */}
        <Text style={styles.copyright}>
          © 2024 MoveBoss. All rights reserved.
        </Text>
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
  appSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  appName: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  appVersion: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  appTagline: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.subheadline,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linksCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  linkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkLabel: {
    ...typography.body,
    color: colors.primary,
  },
  copyright: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
