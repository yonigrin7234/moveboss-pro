/**
 * PremiumButton - A $1B quality button with animations and haptics
 *
 * Features:
 * - Scale animation on press (0.97)
 * - Haptic feedback
 * - Loading state with spinner
 * - Multiple variants (primary, secondary, ghost, danger)
 * - Glow effect on primary buttons
 * - Icon support (left or right)
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { springs } from '../../lib/animations';
import { componentHaptics } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface PremiumButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  gradient?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function PremiumButton({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  gradient = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}: PremiumButtonProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, springs.snappy);
    pressed.value = withSpring(1, springs.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springs.snappy);
    pressed.value = withSpring(0, springs.snappy);
  }, []);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;

    // Haptic feedback based on variant
    componentHaptics.button[variant]();

    onPress();
  }, [disabled, loading, variant, onPress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: interpolate(pressed.value, [0, 1], [1, 0.9]),
    };
  });

  const isDisabled = disabled || loading;

  // Get variant styles
  const variantStyles = getVariantStyles(variant, isDisabled);
  const sizeStyles = getSizeStyles(size);

  const content = (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.white : colors.primary}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              sizeStyles.text,
              variantStyles.text,
              textStyle,
            ]}
          >
            {children}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </>
      )}
    </View>
  );

  // Gradient primary button
  if (variant === 'primary' && gradient && !isDisabled) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          animatedStyle,
          fullWidth && styles.fullWidth,
          style,
        ]}
        accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <LinearGradient
          colors={['#818CF8', '#6366F1', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            sizeStyles.button,
            shadows.glow,
            { borderWidth: 0 },
          ]}
        >
          {content}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.button,
        sizeStyles.button,
        variantStyles.button,
        animatedStyle,
        fullWidth && styles.fullWidth,
        variant === 'primary' && !isDisabled && shadows.glow,
        style,
      ]}
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {content}
    </AnimatedPressable>
  );
}

function getVariantStyles(variant: ButtonVariant, disabled: boolean) {
  if (disabled) {
    return {
      button: {
        backgroundColor: colors.surfacePressed,
        borderColor: colors.border,
      } as ViewStyle,
      text: {
        color: colors.textMuted,
      } as TextStyle,
    };
  }

  switch (variant) {
    case 'primary':
      return {
        button: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        } as ViewStyle,
        text: {
          color: colors.white,
        } as TextStyle,
      };
    case 'secondary':
      return {
        button: {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        } as ViewStyle,
        text: {
          color: colors.textPrimary,
        } as TextStyle,
      };
    case 'ghost':
      return {
        button: {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        } as ViewStyle,
        text: {
          color: colors.primary,
        } as TextStyle,
      };
    case 'danger':
      return {
        button: {
          backgroundColor: colors.error,
          borderColor: colors.error,
        } as ViewStyle,
        text: {
          color: colors.white,
        } as TextStyle,
      };
    default:
      return {
        button: {} as ViewStyle,
        text: {} as TextStyle,
      };
  }
}

function getSizeStyles(size: ButtonSize) {
  switch (size) {
    case 'sm':
      return {
        button: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.sm,
        } as ViewStyle,
        text: {
          ...typography.buttonSmall,
        } as TextStyle,
      };
    case 'lg':
      return {
        button: {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xxl,
          borderRadius: radius.lg,
        } as ViewStyle,
        text: {
          ...typography.button,
          fontSize: 18,
        } as TextStyle,
      };
    case 'md':
    default:
      return {
        button: {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.button,
        } as ViewStyle,
        text: {
          ...typography.button,
        } as TextStyle,
      };
  }
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});

export default PremiumButton;
