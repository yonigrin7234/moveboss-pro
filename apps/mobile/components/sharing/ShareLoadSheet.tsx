/**
 * ShareLoadSheet - Bottom sheet for sharing loads via WhatsApp or clipboard
 *
 * Features:
 * - Share to WhatsApp with formatted message
 * - Copy to clipboard
 * - Toggle rate visibility
 * - Message preview
 */

import React, { forwardRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { BottomSheet, BottomSheetRef } from '../ui/BottomSheet';
import { Icon } from '../ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { haptics } from '../../lib/haptics';
import { buildShareMessage, type ShareableLoad } from '../../lib/sharing';

interface ShareLoadSheetProps {
  load: ShareableLoad | null;
  companyName?: string;
  onClose?: () => void;
}

export const ShareLoadSheet = forwardRef<BottomSheetRef, ShareLoadSheetProps>(
  ({ load, companyName, onClose }, ref) => {
    const [showRates, setShowRates] = useState(true);

    const message = useMemo(() => {
      if (!load) return '';
      return buildShareMessage([load], {
        showRates,
        companyName,
      });
    }, [load, showRates, companyName]);

    const handleShareWhatsApp = async () => {
      if (!message) return;

      haptics.selection();

      // Encode message for WhatsApp URL
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;

      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
          haptics.success();
        } else {
          // Fallback to system share
          await Share.share({ message });
          haptics.success();
        }
      } catch (error) {
        console.error('Error sharing to WhatsApp:', error);
        haptics.error();
        Alert.alert('Error', 'Could not open WhatsApp. Try copying the message instead.');
      }
    };

    const handleCopyToClipboard = async () => {
      if (!message) return;

      haptics.selection();

      try {
        await Clipboard.setStringAsync(message);
        haptics.success();
        Alert.alert('Copied', 'Message copied to clipboard');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        haptics.error();
        Alert.alert('Error', 'Could not copy to clipboard');
      }
    };

    const handleSystemShare = async () => {
      if (!message) return;

      haptics.selection();

      try {
        await Share.share({ message });
        haptics.success();
      } catch (error) {
        console.error('Error sharing:', error);
        haptics.error();
      }
    };

    if (!load) return null;

    return (
      <BottomSheet
        ref={ref}
        title="Share Load"
        snapPoints={['55%']}
        onClose={onClose}
      >
        <View style={styles.container}>
          {/* Rate Toggle */}
          <Pressable
            style={styles.toggleRow}
            onPress={() => setShowRates(!showRates)}
          >
            <Text style={styles.toggleLabel}>Include rates in message</Text>
            <View style={[styles.toggle, showRates && styles.toggleActive]}>
              <View style={[styles.toggleKnob, showRates && styles.toggleKnobActive]} />
            </View>
          </Pressable>

          {/* Message Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewText}>{message}</Text>
          </View>

          {/* Share Buttons */}
          <View style={styles.shareButtons}>
            <Pressable
              style={[styles.shareButton, styles.whatsappButton]}
              onPress={handleShareWhatsApp}
            >
              <Icon name="message-square" size="md" color={colors.white} />
              <Text style={styles.shareButtonText}>WhatsApp</Text>
            </Pressable>

            <Pressable
              style={[styles.shareButton, styles.copyButton]}
              onPress={handleCopyToClipboard}
            >
              <Icon name="copy" size="md" color={colors.textPrimary} />
              <Text style={[styles.shareButtonText, styles.copyButtonText]}>Copy</Text>
            </Pressable>

            <Pressable
              style={[styles.shareButton, styles.moreButton]}
              onPress={handleSystemShare}
            >
              <Icon name="share" size="md" color={colors.textPrimary} />
              <Text style={[styles.shareButtonText, styles.moreButtonText]}>More</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    );
  }
);

ShareLoadSheet.displayName = 'ShareLoadSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  previewCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    maxHeight: 160,
  },
  previewLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  previewText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
  whatsappButton: {
    backgroundColor: '#25D366', // WhatsApp green
    ...shadows.sm,
  },
  copyButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moreButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  copyButtonText: {
    color: colors.textPrimary,
  },
  moreButtonText: {
    color: colors.textPrimary,
  },
});

export default ShareLoadSheet;
