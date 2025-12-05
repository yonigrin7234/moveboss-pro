/**
 * DeliveryCompleteScreen - Full-screen delivery completion celebration
 *
 * Features:
 * - Prominent "Complete Delivery" button
 * - Success celebration with confetti
 * - Auto-navigate to next load or trip summary
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { haptics } from '../../lib/haptics';
import { SuccessCelebration } from './SuccessCelebration';
import { Icon, IconWithBackground } from './Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DeliveryCompleteScreenProps {
  loadNumber: string;
  deliveryAddress: string;
  onComplete: () => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
  onSuccess: () => void;
  hasNextLoad: boolean;
  nextLoadNumber?: string;
}

export function DeliveryCompleteScreen({
  loadNumber,
  deliveryAddress,
  onComplete,
  onCancel,
  onSuccess,
  hasNextLoad,
  nextLoadNumber,
}: DeliveryCompleteScreenProps) {
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const buttonScale = useSharedValue(1);

  const handleComplete = useCallback(async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    // Button press animation
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 200 })
    );

    try {
      const result = await onComplete();

      if (result.success) {
        // Celebration happens in SuccessCelebration component
        setShowSuccess(true);
      } else {
        setError(result.error || 'Failed to complete delivery');
        haptics.error();
      }
    } catch (err) {
      setError('Something went wrong');
      haptics.error();
    } finally {
      setSubmitting(false);
    }
  }, [onComplete, submitting]);

  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false);
    onSuccess();
  }, [onSuccess]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (showSuccess) {
    const title = hasNextLoad ? 'Delivered!' : 'All Done!';
    const subtitle = hasNextLoad
      ? `Next: Load #${nextLoadNumber}`
      : 'Trip completed';

    return (
      <SuccessCelebration
        title={title}
        subtitle={subtitle}
        icon="package"
        onComplete={handleSuccessComplete}
        autoDismissDelay={2000}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.View entering={FadeIn.delay(100)} style={styles.heroSection}>
          <IconWithBackground
            name="package"
            size={48}
            color={colors.primary}
            backgroundColor={colors.primarySoft}
            backgroundSizeMultiplier={2}
          />
          <Text style={styles.title}>Complete Delivery</Text>
          <Text style={styles.loadInfo}>Load #{loadNumber}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(200)}
          style={styles.addressCard}
        >
          <Text style={styles.addressLabel}>DELIVERED TO</Text>
          <Text style={styles.addressText}>{deliveryAddress}</Text>
        </Animated.View>

        {error && (
          <Animated.View entering={FadeIn} style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}
      </View>

      {/* Complete Button */}
      <Animated.View
        entering={FadeIn.delay(300)}
        style={styles.footer}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleComplete}
          disabled={submitting}
        >
          <Animated.View style={[styles.completeButton, buttonAnimatedStyle]}>
            <View style={styles.buttonContent}>
              {!submitting && <Icon name="check" size="md" color={colors.white} style={{ marginRight: spacing.sm }} />}
              <Text style={styles.completeButtonText}>
                {submitting ? 'Completing...' : 'Confirm Delivery'}
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>

        {hasNextLoad && (
          <Text style={styles.nextHint}>
            Next up: Load #{nextLoadNumber}
          </Text>
        )}
      </Animated.View>
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
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  cancelButton: {
    padding: spacing.sm,
  },
  cancelText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
  },
  title: {
    marginTop: spacing.xl,
    ...typography.hero,
    fontSize: 36,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  loadInfo: {
    ...typography.headline,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    width: SCREEN_WIDTH - 40,
    alignItems: 'center',
  },
  addressLabel: {
    ...typography.label,
    marginBottom: spacing.md,
  },
  addressText: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: colors.errorMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    width: SCREEN_WIDTH - 40,
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 40,
    paddingTop: spacing.lg,
  },
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    paddingVertical: 22,
    alignItems: 'center',
    ...shadows.glowSuccess,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    ...typography.button,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  nextHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default DeliveryCompleteScreen;
