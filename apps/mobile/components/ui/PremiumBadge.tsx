/**
 * PremiumBadge - Elegant status badge with optional animations
 *
 * Features:
 * - Pill shape with subtle tint background
 * - Multiple variants (default, success, warning, error, info, primary)
 * - Optional pulse animation for "new" or attention items
 * - Icon support (left position)
 * - Size variants (sm, md, lg)
 * - Outlined variant option
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../../lib/theme';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface PremiumBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  pulse?: boolean;
  outlined?: boolean;
  dot?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function PremiumBadge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  pulse = false,
  outlined = false,
  dot = false,
  style,
  textStyle,
  accessibilityLabel,
}: PremiumBadgeProps) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (pulse) {
      // Pulse ring animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );

      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );

      // Cleanup infinite animations on unmount
      return () => {
        pulseScale.value = 1;
        pulseOpacity.value = 0;
      };
    } else {
      pulseScale.value = 1;
      pulseOpacity.value = 0;
    }
  }, [pulse]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const variantStyles = getVariantStyles(variant, outlined);
  const sizeStyles = getSizeStyles(size);

  return (
    <View
      style={styles.wrapper}
      accessibilityLabel={
        accessibilityLabel ||
        (typeof children === 'string' ? children : undefined)
      }
      accessibilityRole="text"
    >
      {/* Pulse ring */}
      {pulse && (
        <AnimatedView
          style={[
            styles.pulseRing,
            { backgroundColor: variantStyles.pulseColor },
            sizeStyles.badge,
            pulseAnimatedStyle,
          ]}
        />
      )}

      {/* Badge */}
      <View
        style={[
          styles.badge,
          sizeStyles.badge,
          variantStyles.badge,
          style,
        ]}
      >
        {/* Dot indicator */}
        {dot && (
          <View style={[styles.dot, { backgroundColor: variantStyles.dotColor }]} />
        )}

        {/* Icon */}
        {icon && <View style={styles.icon}>{icon}</View>}

        {/* Text */}
        <Text
          style={[
            styles.text,
            sizeStyles.text,
            variantStyles.text,
            textStyle,
          ]}
          numberOfLines={1}
        >
          {children}
        </Text>
      </View>
    </View>
  );
}

function getVariantStyles(variant: BadgeVariant, outlined: boolean) {
  const variants = {
    default: {
      bg: colors.surfaceElevated,
      bgOutlined: 'transparent',
      border: colors.border,
      text: colors.textSecondary,
      pulse: colors.textMuted,
      dot: colors.textMuted,
    },
    primary: {
      bg: colors.primarySoft,
      bgOutlined: 'transparent',
      border: colors.primary,
      text: colors.primary,
      pulse: colors.primary,
      dot: colors.primary,
    },
    success: {
      bg: colors.successSoft,
      bgOutlined: 'transparent',
      border: colors.success,
      text: colors.success,
      pulse: colors.success,
      dot: colors.success,
    },
    warning: {
      bg: colors.warningSoft,
      bgOutlined: 'transparent',
      border: colors.warning,
      text: colors.warning,
      pulse: colors.warning,
      dot: colors.warning,
    },
    error: {
      bg: colors.errorSoft,
      bgOutlined: 'transparent',
      border: colors.error,
      text: colors.error,
      pulse: colors.error,
      dot: colors.error,
    },
    info: {
      bg: colors.infoSoft,
      bgOutlined: 'transparent',
      border: colors.info,
      text: colors.info,
      pulse: colors.info,
      dot: colors.info,
    },
  };

  const v = variants[variant];

  return {
    badge: {
      backgroundColor: outlined ? v.bgOutlined : v.bg,
      borderColor: outlined ? v.border : 'transparent',
      borderWidth: outlined ? 1 : 0,
    } as ViewStyle,
    text: {
      color: v.text,
    } as TextStyle,
    pulseColor: v.pulse,
    dotColor: v.dot,
  };
}

function getSizeStyles(size: BadgeSize) {
  switch (size) {
    case 'sm':
      return {
        badge: {
          paddingVertical: spacing.xxs,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.sm,
        } as ViewStyle,
        text: {
          fontSize: 10,
          fontWeight: '600' as const,
          letterSpacing: 0.3,
        } as TextStyle,
      };
    case 'lg':
      return {
        badge: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
        } as ViewStyle,
        text: {
          fontSize: 14,
          fontWeight: '600' as const,
          letterSpacing: 0,
        } as TextStyle,
      };
    case 'md':
    default:
      return {
        badge: {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radius.badge,
        } as ViewStyle,
        text: {
          fontSize: 12,
          fontWeight: '600' as const,
          letterSpacing: 0.2,
        } as TextStyle,
      };
  }
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textTransform: 'uppercase',
  },
  icon: {
    marginRight: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

// Convenience components for common statuses
export function LiveBadge(props: Omit<PremiumBadgeProps, 'variant' | 'pulse' | 'dot'>) {
  return (
    <PremiumBadge variant="error" pulse dot {...props}>
      {props.children || 'LIVE'}
    </PremiumBadge>
  );
}

export function NewBadge(props: Omit<PremiumBadgeProps, 'variant' | 'pulse'>) {
  return (
    <PremiumBadge variant="primary" pulse {...props}>
      {props.children || 'NEW'}
    </PremiumBadge>
  );
}

export default PremiumBadge;
