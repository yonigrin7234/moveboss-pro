/**
 * Company Info Screen
 * View company details and information
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useOwner } from '../../../providers/OwnerProvider';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';

export default function CompanyInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { company, role } = useOwner();

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const companyDetails = [
    { label: 'Company Name', value: company?.name || 'Not set' },
    { label: 'Type', value: company?.is_broker && company?.is_carrier ? 'Broker & Carrier' : company?.is_broker ? 'Broker' : company?.is_carrier ? 'Carrier' : 'Not set' },
    { label: 'Your Role', value: role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Company Info</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Company Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Icon name="building" size={48} color={colors.primary} />
          </View>
          <Text style={styles.companyName}>{company?.name || 'Your Company'}</Text>
        </View>

        {/* Company Details */}
        <View style={styles.detailsCard}>
          {companyDetails.map((detail, index) => (
            <View
              key={index}
              style={[
                styles.detailRow,
                index < companyDetails.length - 1 && styles.detailRowBorder,
              ]}
            >
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{detail.value}</Text>
            </View>
          ))}
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Icon name="info" size="sm" color={colors.textMuted} />
          <Text style={styles.infoText}>
            Company information can be updated from the web dashboard.
          </Text>
        </View>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  companyName: {
    ...typography.title,
    color: colors.textPrimary,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
});
