/**
 * MarketplaceActionSheet - Bottom sheet for posting/unposting loads to marketplace
 */

import React, { forwardRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { BottomSheet, BottomSheetRef } from '../ui/BottomSheet';
import { Icon } from '../ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { haptics } from '../../lib/haptics';
import { useMarketplaceActions } from '../../hooks/useMarketplaceActions';

interface MarketplaceActionSheetProps {
  loadId: string | null;
  isCurrentlyPosted: boolean;
  loadNumber?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const MarketplaceActionSheet = forwardRef<BottomSheetRef, MarketplaceActionSheetProps>(
  ({ loadId, isCurrentlyPosted, loadNumber, onClose, onSuccess }, ref) => {
    const { postToMarketplace, unpostFromMarketplace, isPosting, isUnposting } = useMarketplaceActions();
    const [selectedType, setSelectedType] = useState<'rfd' | 'live_load' | 'pickup'>('rfd');

    const isLoading = isPosting || isUnposting;

    const handlePost = async () => {
      if (!loadId) return;

      haptics.selection();

      try {
        await postToMarketplace({
          loadId,
          postingType: selectedType,
        });
        haptics.success();
        Alert.alert('Success', 'Load posted to marketplace');
        onSuccess?.();
        onClose?.();
      } catch (error) {
        haptics.error();
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to post load');
      }
    };

    const handleUnpost = async () => {
      if (!loadId) return;

      haptics.selection();

      try {
        await unpostFromMarketplace({ loadId });
        haptics.success();
        Alert.alert('Success', 'Load removed from marketplace');
        onSuccess?.();
        onClose?.();
      } catch (error) {
        haptics.error();
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to unpost load');
      }
    };

    const postingTypes: { key: 'rfd' | 'live_load' | 'pickup'; label: string; description: string }[] = [
      { key: 'rfd', label: 'RFD Load', description: 'Load waiting for delivery' },
      { key: 'live_load', label: 'Live Load', description: 'Pickup available now' },
      { key: 'pickup', label: 'Pickup Only', description: 'Pickup in need of carrier' },
    ];

    if (!loadId) return null;

    return (
      <BottomSheet
        ref={ref}
        title={isCurrentlyPosted ? 'Remove from Marketplace' : 'Post to Marketplace'}
        snapPoints={['50%']}
        onClose={onClose}
      >
        <View style={styles.container}>
          {loadNumber && (
            <Text style={styles.loadNumber}>Load: {loadNumber}</Text>
          )}

          {isCurrentlyPosted ? (
            <>
              <View style={styles.infoCard}>
                <Icon name="upload" size="md" color={colors.success} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Currently Listed</Text>
                  <Text style={styles.infoText}>
                    This load is visible on the marketplace and can receive requests from carriers.
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleUnpost}
                disabled={isLoading}
              >
                {isUnposting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Icon name="x" size="md" color={colors.white} />
                    <Text style={styles.actionButtonText}>Remove from Marketplace</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Select Posting Type</Text>

              {postingTypes.map((type) => (
                <Pressable
                  key={type.key}
                  style={[
                    styles.typeOption,
                    selectedType === type.key && styles.typeOptionActive,
                  ]}
                  onPress={() => setSelectedType(type.key)}
                >
                  <View style={[
                    styles.radioOuter,
                    selectedType === type.key && styles.radioOuterActive,
                  ]}>
                    {selectedType === type.key && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.typeContent}>
                    <Text style={[
                      styles.typeLabel,
                      selectedType === type.key && styles.typeLabelActive,
                    ]}>
                      {type.label}
                    </Text>
                    <Text style={styles.typeDescription}>{type.description}</Text>
                  </View>
                </Pressable>
              ))}

              <Pressable
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handlePost}
                disabled={isLoading}
              >
                {isPosting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Icon name="upload" size="md" color={colors.white} />
                    <Text style={styles.actionButtonText}>Post to Marketplace</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </BottomSheet>
    );
  }
);

MarketplaceActionSheet.displayName = 'MarketplaceActionSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadNumber: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  typeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  typeContent: {
    flex: 1,
  },
  typeLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  typeLabelActive: {
    color: colors.primary,
  },
  typeDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  dangerButton: {
    backgroundColor: colors.error,
    ...shadows.glowError,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default MarketplaceActionSheet;
