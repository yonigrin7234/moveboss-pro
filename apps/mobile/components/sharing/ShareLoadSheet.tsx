/**
 * ShareLoadSheet - Bottom sheet for sharing loads via WhatsApp or clipboard
 *
 * Features:
 * - Share to WhatsApp with formatted message
 * - Copy to clipboard
 * - Toggle rate visibility
 * - Message preview with shareable link
 */

import React, { forwardRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Share, Alert, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { BottomSheet, BottomSheetRef } from '../ui/BottomSheet';
import { Icon } from '../ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { haptics } from '../../lib/haptics';
import { buildShareMessage, type ShareableLoad } from '../../lib/sharing';
import { useAuth } from '../../providers/AuthProvider';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://moveboss-pro.vercel.app';

interface ShareLoadSheetProps {
  load: ShareableLoad | null;
  companyName?: string;
  onClose?: () => void;
  isOpen?: boolean;
}

export const ShareLoadSheet = forwardRef<BottomSheetRef, ShareLoadSheetProps>(
  ({ load, companyName, onClose, isOpen }, ref) => {
    const [showRates, setShowRates] = useState(true);
    const [message, setMessage] = useState('');
    const [shareLink, setShareLink] = useState('');
    const [loading, setLoading] = useState(false);
    const { session } = useAuth();

    // Generate share text with link from API
    const generateShareText = useCallback(async () => {
      if (!load?.id || !session?.access_token) {
        // Fallback to local generation without link
        if (load) {
          const localMessage = buildShareMessage([load], {
            showRates,
            companyName,
          });
          setMessage(localMessage);
        }
        return;
      }

      setLoading(true);
      try {
        console.log('[ShareLoadSheet] Calling API:', `${API_URL}/api/sharing`);
        console.log('[ShareLoadSheet] Load data:', JSON.stringify({
          id: load.id,
          pickup_city: load.pickup_city,
          pickup_state: load.pickup_state,
          pickup_postal_code: load.pickup_postal_code,
          delivery_city: load.delivery_city,
          delivery_state: load.delivery_state,
          delivery_postal_code: load.delivery_postal_code,
        }));

        const response = await fetch(`${API_URL}/api/sharing`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'generate-text',
            loadIds: [load.id],
            format: 'whatsapp',
            includeLink: true,
            linkType: 'single',
          }),
        });

        console.log('[ShareLoadSheet] API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[ShareLoadSheet] API success, text:', data.text?.substring(0, 100) + '...');
          console.log('[ShareLoadSheet] API link:', data.link);
          setMessage(data.text);
          setShareLink(data.link);
        } else {
          const errorText = await response.text();
          console.log('[ShareLoadSheet] API error:', response.status, errorText);
          // Fallback to local generation
          const localMessage = buildShareMessage([load], {
            showRates,
            companyName,
          });
          setMessage(localMessage);
        }
      } catch (error) {
        console.error('[ShareLoadSheet] API exception:', error);
        // Fallback to local generation
        if (load) {
          console.log('[ShareLoadSheet] Using local fallback');
          const localMessage = buildShareMessage([load], {
            showRates,
            companyName,
          });
          setMessage(localMessage);
        }
      } finally {
        setLoading(false);
      }
    }, [load, session?.access_token, showRates, companyName]);

    // Generate message when sheet opens or showRates changes
    useEffect(() => {
      if (load && isOpen !== false) {
        generateShareText();
      }
    }, [load?.id, isOpen, showRates, generateShareText]);

    // Update message locally when toggling rates (re-generate with API)
    useEffect(() => {
      if (load && shareLink) {
        // If we have a link, regenerate the message locally with the existing link
        const localMessage = buildShareMessage([load], {
          showRates,
          companyName,
          link: shareLink,
        });
        setMessage(localMessage);
      }
    }, [showRates, load, companyName, shareLink]);

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
        snapPoints={['70%']}
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
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Generating share link...</Text>
              </View>
            ) : (
              <Text style={styles.previewText}>{message}</Text>
            )}
          </View>

          {/* Share Buttons */}
          <View style={styles.shareButtons}>
            <Pressable
              style={[styles.shareButton, styles.whatsappButton, loading && styles.disabledButton]}
              onPress={handleShareWhatsApp}
              disabled={loading}
            >
              <Icon name="message-square" size="md" color={colors.white} />
              <Text style={styles.shareButtonText}>WhatsApp</Text>
            </Pressable>

            <Pressable
              style={[styles.shareButton, styles.copyButton, loading && styles.disabledButton]}
              onPress={handleCopyToClipboard}
              disabled={loading}
            >
              <Icon name="copy" size="md" color={colors.textPrimary} />
              <Text style={[styles.shareButtonText, styles.copyButtonText]}>Copy</Text>
            </Pressable>

            <Pressable
              style={[styles.shareButton, styles.moreButton, loading && styles.disabledButton]}
              onPress={handleSystemShare}
              disabled={loading}
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
    minHeight: 120,
    maxHeight: 180,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
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
  disabledButton: {
    opacity: 0.5,
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
