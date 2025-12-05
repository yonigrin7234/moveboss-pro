/**
 * StatusGlow - Animated glow effect for status changes
 *
 * Features:
 * - Pulsing glow animation
 * - Color based on status type
 * - Auto-stops after a duration
 * - Can wrap any component
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors, radius } from '../../lib/theme';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'primary';

interface StatusGlowProps {
  children: React.ReactNode;
  status: StatusType;
  active?: boolean;
  duration?: number; // ms, 0 = infinite
  intensity?: 'low' | 'medium' | 'high';
  style?: ViewStyle;
}

const glowColors: Record<StatusType, string> = {
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
  primary: colors.primary,
};

const intensityValues = {
  low: { minOpacity: 0.1, maxOpacity: 0.3, blur: 8 },
  medium: { minOpacity: 0.2, maxOpacity: 0.5, blur: 12 },
  high: { minOpacity: 0.3, maxOpacity: 0.7, blur: 16 },
};

export function StatusGlow({
  children,
  status,
  active = true,
  duration = 3000,
  intensity = 'medium',
  style,
}: StatusGlowProps) {
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  const { minOpacity, maxOpacity } = intensityValues[intensity];

  useEffect(() => {
    if (active) {
      // Start glow animation
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(maxOpacity, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(minOpacity, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        duration === 0 ? -1 : Math.ceil(duration / 1200),
        true
      );

      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        duration === 0 ? -1 : Math.ceil(duration / 1200),
        true
      );

      // Auto-stop after duration
      if (duration > 0) {
        const timeout = setTimeout(() => {
          glowOpacity.value = withTiming(0, { duration: 300 });
          glowScale.value = withTiming(1, { duration: 300 });
        }, duration);
        return () => clearTimeout(timeout);
      } else {
        // Cleanup for infinite animations
        return () => {
          glowOpacity.value = 0;
          glowScale.value = 1;
        };
      }
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
      glowScale.value = withTiming(1, { duration: 300 });
    }
  }, [active, duration, maxOpacity, minOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const glowColor = glowColors[status];

  return (
    <View style={[styles.container, style]}>
      {/* Glow layer behind */}
      <Animated.View
        style={[
          styles.glowLayer,
          {
            backgroundColor: glowColor,
            shadowColor: glowColor,
            shadowOpacity: 0.5,
            shadowRadius: intensityValues[intensity].blur,
            shadowOffset: { width: 0, height: 0 },
          },
          glowStyle,
        ]}
      />
      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/**
 * Hook for applying glow effect to any component
 */
export function useStatusGlow(status: StatusType, active = true, duration = 3000) {
  const glowOpacity = useSharedValue(0);
  const { minOpacity, maxOpacity } = intensityValues.medium;

  useEffect(() => {
    if (active) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(maxOpacity, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(minOpacity, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        duration === 0 ? -1 : Math.ceil(duration / 1200),
        true
      );

      if (duration > 0) {
        const timeout = setTimeout(() => {
          glowOpacity.value = withTiming(0, { duration: 300 });
        }, duration);
        return () => clearTimeout(timeout);
      } else {
        // Cleanup for infinite animations
        return () => { glowOpacity.value = 0; };
      }
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [active, duration]);

  const glowColor = glowColors[status];

  const animatedStyle = useAnimatedStyle(() => ({
    shadowColor: glowColor,
    shadowOpacity: glowOpacity.value,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  }));

  return animatedStyle;
}

/**
 * Success celebration glow - pulses once then fades
 */
export function SuccessGlow({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withSequence(
      withTiming(0.6, { duration: 200 }),
      withDelay(800, withTiming(0, { duration: 500 }))
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    shadowColor: colors.success,
    shadowOpacity: glowOpacity.value,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  }));

  return (
    <Animated.View style={[style, glowStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.card,
  },
  content: {
    position: 'relative',
  },
});

export default StatusGlow;
