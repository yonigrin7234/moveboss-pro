/**
 * PremiumCard - Elegant card component with press animations
 *
 * Features:
 * - Scale + opacity animation on press
 * - Multiple variants (default, elevated, outlined)
 * - Optional gradient border effect
 * - Haptic feedback on press
 * - Header and footer slots
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { springs } from '../../lib/animations';
import { componentHaptics } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';

interface PremiumCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: CardVariant;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  title?: string;
  subtitle?: string;
  gradientBorder?: boolean;
  noPadding?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function PremiumCard({
  children,
  onPress,
  variant = 'default',
  header,
  footer,
  title,
  subtitle,
  gradientBorder = false,
  noPadding = false,
  style,
  accessibilityLabel,
}: PremiumCardProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(0.98, springs.smooth);
    pressed.value = withSpring(1, springs.smooth);
  }, [onPress]);

  const handlePressOut = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(1, springs.smooth);
    pressed.value = withSpring(0, springs.smooth);
  }, [onPress]);

  const handlePress = useCallback(() => {
    if (!onPress) return;
    componentHaptics.card.press();
    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      pressed.value,
      [0, 1],
      [getVariantBackground(variant), colors.surfacePressed]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
    };
  });

  const variantStyles = getVariantStyles(variant);

  const cardContent = (
    <>
      {(title || subtitle || header) && (
        <View style={[styles.header, noPadding && styles.headerPadded]}>
          {header || (
            <>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </>
          )}
        </View>
      )}
      <View style={[!noPadding && styles.content]}>
        {children}
      </View>
      {footer && (
        <View style={[styles.footer, noPadding && styles.footerPadded]}>
          {footer}
        </View>
      )}
    </>
  );

  // Gradient border wrapper
  if (gradientBorder) {
    return (
      <LinearGradient
        colors={[colors.primary, colors.primaryMuted, colors.border]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientBorder, style]}
      >
        <AnimatedPressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!onPress}
          style={[
            styles.card,
            styles.gradientInner,
            variantStyles,
            animatedStyle,
          ]}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole={onPress ? 'button' : undefined}
        >
          {cardContent}
        </AnimatedPressable>
      </LinearGradient>
    );
  }

  // Non-pressable card
  if (!onPress) {
    return (
      <View
        style={[
          styles.card,
          variantStyles,
          noPadding && styles.noPadding,
          style,
        ]}
        accessibilityLabel={accessibilityLabel}
      >
        {cardContent}
      </View>
    );
  }

  // Pressable card
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        variantStyles,
        noPadding && styles.noPadding,
        animatedStyle,
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {cardContent}
    </AnimatedPressable>
  );
}

function getVariantBackground(variant: CardVariant): string {
  switch (variant) {
    case 'elevated':
      return colors.surfaceElevated;
    case 'outlined':
      return colors.surface;
    case 'glass':
      return 'rgba(18, 18, 26, 0.8)';
    case 'default':
    default:
      return colors.surface;
  }
}

function getVariantStyles(variant: CardVariant): ViewStyle {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 0,
        ...shadows.md,
      };
    case 'outlined':
      return {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
      };
    case 'glass':
      return {
        backgroundColor: 'rgba(18, 18, 26, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      };
    case 'default':
    default:
      return {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      };
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    overflow: 'hidden',
  },
  noPadding: {
    padding: 0,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerPadded: {
    padding: spacing.cardPadding,
    paddingBottom: 0,
  },
  content: {
    // Content styling
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerPadded: {
    padding: spacing.cardPadding,
    paddingTop: spacing.md,
  },
  title: {
    ...typography.headline,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  gradientBorder: {
    borderRadius: radius.card + 1,
    padding: 1,
  },
  gradientInner: {
    margin: 0,
  },
});

export default PremiumCard;
