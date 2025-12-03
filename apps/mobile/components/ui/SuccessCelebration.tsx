/**
 * SuccessCelebration - Full-screen success animation
 *
 * Features:
 * - Animated checkmark burst
 * - Optional confetti particles
 * - Haptic feedback sequence
 * - Auto-dismiss with callback
 * - Customizable message
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../../lib/theme';
import { haptics } from '../../lib/haptics';
import { Icon, IconName } from './Icon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NUM_PARTICLES = 20;

interface SuccessCelebrationProps {
  title: string;
  subtitle?: string;
  /** Icon name from lucide or emoji fallback */
  icon?: IconName | string;
  onComplete: () => void;
  autoDismissDelay?: number;
  showConfetti?: boolean;
}

// Check if icon is a valid IconName
const isIconName = (icon: string): icon is IconName => {
  const iconNames = ['check', 'check-circle', 'package', 'truck', 'dollar', 'banknote', 'star', 'heart', 'sparkles', 'trophy', 'award', 'gift'];
  return iconNames.includes(icon);
};

export function SuccessCelebration({
  title,
  subtitle,
  icon = 'check',
  onComplete,
  autoDismissDelay = 2000,
  showConfetti = true,
}: SuccessCelebrationProps) {
  // Animation values
  const scale = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(1);
  const containerOpacity = useSharedValue(1);

  // Particle values
  const particles = Array.from({ length: NUM_PARTICLES }, (_, i) => ({
    x: useSharedValue(0),
    y: useSharedValue(0),
    scale: useSharedValue(0),
    opacity: useSharedValue(0),
    rotation: useSharedValue(0),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

  const triggerHaptics = useCallback(async () => {
    await haptics.celebration();
  }, []);

  const dismiss = useCallback(() => {
    containerOpacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(onComplete)();
    });
  }, [onComplete]);

  useEffect(() => {
    // Trigger haptic feedback
    triggerHaptics();

    // Main animation sequence
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });

    iconScale.value = withSequence(
      withDelay(100, withSpring(1.2, { damping: 8, stiffness: 300 })),
      withSpring(1, { damping: 15, stiffness: 200 })
    );

    textOpacity.value = withDelay(300, withSpring(1, { damping: 20 }));

    // Ring burst animation
    ringScale.value = withDelay(
      200,
      withTiming(2.5, { duration: 600, easing: Easing.out(Easing.ease) })
    );
    ringOpacity.value = withDelay(
      200,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) })
    );

    // Confetti particles
    if (showConfetti) {
      particles.forEach((particle, i) => {
        const angle = (i / NUM_PARTICLES) * Math.PI * 2;
        const distance = 100 + Math.random() * 150;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance - 50;

        particle.opacity.value = withDelay(
          200 + i * 20,
          withSequence(
            withTiming(1, { duration: 100 }),
            withDelay(400, withTiming(0, { duration: 400 }))
          )
        );

        particle.scale.value = withDelay(
          200 + i * 20,
          withSequence(
            withSpring(1, { damping: 8, stiffness: 200 }),
            withDelay(300, withTiming(0.5, { duration: 300 }))
          )
        );

        particle.x.value = withDelay(
          200 + i * 20,
          withTiming(targetX, { duration: 800, easing: Easing.out(Easing.cubic) })
        );

        particle.y.value = withDelay(
          200 + i * 20,
          withTiming(targetY, { duration: 800, easing: Easing.out(Easing.cubic) })
        );

        particle.rotation.value = withDelay(
          200 + i * 20,
          withTiming(Math.random() * 720 - 360, { duration: 800 })
        );
      });
    }

    // Auto dismiss
    const timer = setTimeout(() => {
      dismiss();
    }, autoDismissDelay);

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      {
        translateY: interpolate(textOpacity.value, [0, 1], [20, 0]),
      },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
      <Animated.View style={[styles.container, containerStyle]}>
        {/* Background */}
        <View style={styles.background} />

        {/* Confetti particles */}
        {showConfetti &&
          particles.map((particle, i) => (
            <ConfettiParticle key={i} particle={particle} />
          ))}

        {/* Ring burst */}
        <Animated.View style={[styles.ring, ringStyle]} />

        {/* Main circle */}
        <Animated.View style={[styles.circle, circleStyle]}>
          <Animated.View style={iconStyle}>
            {isIconName(icon) ? (
              <Icon name={icon as IconName} size={56} color={colors.white} strokeWidth={2.5} />
            ) : (
              <Text style={styles.iconEmoji}>{icon}</Text>
            )}
          </Animated.View>
        </Animated.View>

        {/* Text */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </Animated.View>

        {/* Tap hint */}
        <Animated.Text style={[styles.tapHint, textStyle]}>
          Tap to continue
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

interface ConfettiParticleProps {
  particle: {
    x: SharedValue<number>;
    y: SharedValue<number>;
    scale: SharedValue<number>;
    opacity: SharedValue<number>;
    rotation: SharedValue<number>;
    color: string;
  };
}

function ConfettiParticle({ particle }: ConfettiParticleProps) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: particle.x.value },
      { translateY: particle.y.value },
      { scale: particle.scale.value },
      { rotate: `${particle.rotation.value}deg` },
    ],
    opacity: particle.opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: particle.color },
        style,
      ]}
    />
  );
}

const CONFETTI_COLORS = [
  colors.primary,
  colors.success,
  colors.warning,
  '#818CF8', // Light indigo
  '#34D399', // Light green
  '#FBBF24', // Yellow
  '#F472B6', // Pink
  '#60A5FA', // Light blue
];

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  iconEmoji: {
    fontSize: 56,
    color: colors.white,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.success,
  },
  textContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  title: {
    ...typography.hero,
    color: colors.white,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  tapHint: {
    position: 'absolute',
    bottom: 60,
    ...typography.caption,
    color: colors.textMuted,
  },
  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});

export default SuccessCelebration;
