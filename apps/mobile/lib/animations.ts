/**
 * Premium Micro-Animations Library
 *
 * Reusable animation utilities for a $1B app feel.
 * Built on react-native-reanimated.
 */

import {
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  SharedValue,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

// =============================================================================
// SPRING CONFIGS
// =============================================================================

export const springs = {
  // Snappy - for button presses
  snappy: { damping: 15, stiffness: 400 },
  // Bouncy - for celebratory animations
  bouncy: { damping: 8, stiffness: 200 },
  // Smooth - for transitions
  smooth: { damping: 20, stiffness: 150 },
  // Gentle - for subtle movements
  gentle: { damping: 25, stiffness: 100 },
  // Default
  default: { damping: 15, stiffness: 150 },
} as const;

// =============================================================================
// TIMING CONFIGS
// =============================================================================

export const timings = {
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
} as const;

export const easings = {
  easeOut: Easing.bezier(0.16, 1, 0.3, 1),
  easeIn: Easing.bezier(0.7, 0, 0.84, 0),
  easeInOut: Easing.bezier(0.87, 0, 0.13, 1),
  bounce: Easing.bounce,
};

// =============================================================================
// ANIMATION PRESETS
// =============================================================================

/**
 * Fade in with slight scale up
 */
export function fadeIn(value: SharedValue<number>, delay = 0) {
  'worklet';
  value.value = withDelay(
    delay,
    withSpring(1, springs.smooth)
  );
}

/**
 * Fade out with slight scale down
 */
export function fadeOut(
  value: SharedValue<number>,
  callback?: () => void
) {
  'worklet';
  value.value = withTiming(0, { duration: timings.fast }, () => {
    if (callback) {
      runOnJS(callback)();
    }
  });
}

/**
 * Slide up from bottom with spring
 */
export function slideUp(
  value: SharedValue<number>,
  fromY = 100,
  delay = 0
) {
  'worklet';
  value.value = fromY;
  value.value = withDelay(delay, withSpring(0, springs.smooth));
}

/**
 * Slide down and fade out
 */
export function slideDown(
  translateY: SharedValue<number>,
  opacity: SharedValue<number>,
  callback?: () => void
) {
  'worklet';
  translateY.value = withTiming(100, { duration: timings.normal });
  opacity.value = withTiming(0, { duration: timings.normal }, () => {
    if (callback) {
      runOnJS(callback)();
    }
  });
}

/**
 * Press animation - scale down and back
 */
export function pressIn(value: SharedValue<number>) {
  'worklet';
  value.value = withSpring(0.97, springs.snappy);
}

export function pressOut(value: SharedValue<number>) {
  'worklet';
  value.value = withSpring(1, springs.snappy);
}

/**
 * Shake animation for errors
 */
export function shake(value: SharedValue<number>) {
  'worklet';
  value.value = withSequence(
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(-5, { duration: 50 }),
    withTiming(5, { duration: 50 }),
    withTiming(0, { duration: 50 })
  );
}

/**
 * Pulse animation for attention
 */
export function pulse(value: SharedValue<number>, repeat = true) {
  'worklet';
  value.value = withRepeat(
    withSequence(
      withTiming(1.05, { duration: 500 }),
      withTiming(1, { duration: 500 })
    ),
    repeat ? -1 : 1,
    true
  );
}

/**
 * Glow pulse animation
 */
export function glowPulse(value: SharedValue<number>, repeat = true) {
  'worklet';
  value.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 800, easing: easings.easeInOut }),
      withTiming(0.3, { duration: 800, easing: easings.easeInOut })
    ),
    repeat ? -1 : 1,
    true
  );
}

/**
 * Pop in animation - for appearing elements
 */
export function popIn(scale: SharedValue<number>, opacity: SharedValue<number>, delay = 0) {
  'worklet';
  scale.value = 0.8;
  opacity.value = 0;
  scale.value = withDelay(delay, withSpring(1, springs.bouncy));
  opacity.value = withDelay(delay, withSpring(1, springs.smooth));
}

/**
 * Stagger delay calculator for list items
 */
export function getStaggerDelay(index: number, baseDelay = 50, maxDelay = 500) {
  return Math.min(index * baseDelay, maxDelay);
}

/**
 * Success checkmark animation
 */
export function drawCheckmark(value: SharedValue<number>, delay = 0) {
  'worklet';
  value.value = 0;
  value.value = withDelay(
    delay,
    withTiming(1, { duration: 400, easing: easings.easeOut })
  );
}

/**
 * Progress animation
 */
export function animateProgress(
  value: SharedValue<number>,
  toValue: number,
  duration = 800
) {
  'worklet';
  value.value = withTiming(toValue, {
    duration,
    easing: easings.easeOut,
  });
}

/**
 * Shimmer animation for skeleton loading
 */
export function shimmer(value: SharedValue<number>) {
  'worklet';
  value.value = withRepeat(
    withTiming(1, { duration: 1500, easing: Easing.linear }),
    -1,
    false
  );
}

// =============================================================================
// INTERPOLATION HELPERS
// =============================================================================

/**
 * Create a fade interpolation
 */
export function interpolateFade(progress: number) {
  'worklet';
  return interpolate(progress, [0, 1], [0, 1], Extrapolation.CLAMP);
}

/**
 * Create a scale interpolation with overshoot
 */
export function interpolateScale(progress: number) {
  'worklet';
  return interpolate(
    progress,
    [0, 0.5, 1],
    [0.8, 1.05, 1],
    Extrapolation.CLAMP
  );
}

/**
 * Create a slide interpolation
 */
export function interpolateSlide(progress: number, distance = 50) {
  'worklet';
  return interpolate(
    progress,
    [0, 1],
    [distance, 0],
    Extrapolation.CLAMP
  );
}

// =============================================================================
// ENTERING/EXITING ANIMATIONS (for Animated.View entering/exiting props)
// =============================================================================

import {
  FadeIn,
  FadeOut,
  FadeInUp,
  FadeInDown,
  FadeOutUp,
  FadeOutDown,
  SlideInUp,
  SlideInDown,
  SlideOutUp,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
  BounceIn,
  BounceOut,
} from 'react-native-reanimated';

// Screen transition presets
export const screenEnter = SlideInUp.springify().damping(20).stiffness(150);
export const screenExit = SlideOutDown.springify().damping(20).stiffness(150);

// Modal presets
export const modalEnter = FadeIn.duration(200).springify();
export const modalExit = FadeOut.duration(150);

// List item presets
export const listItemEnter = (index: number) =>
  FadeInUp.delay(getStaggerDelay(index)).springify().damping(15);
export const listItemExit = FadeOutUp.duration(200);

// Card presets
export const cardEnter = ZoomIn.springify().damping(12);
export const cardExit = ZoomOut.duration(200);

// Bounce presets
export const bounceEnter = BounceIn.delay(100);
export const bounceExit = BounceOut.duration(200);

// =============================================================================
// HOOKS
// =============================================================================

import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';

/**
 * Hook for press animations
 */
export function usePressAnimation() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    'worklet';
    pressIn(scale);
  };

  const onPressOut = () => {
    'worklet';
    pressOut(scale);
  };

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
    handlers: { onPressIn, onPressOut },
  };
}

/**
 * Hook for shake animation
 */
export function useShakeAnimation() {
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const triggerShake = () => {
    shake(translateX);
  };

  return { animatedStyle, triggerShake };
}

/**
 * Hook for fade-in animation on mount
 */
export function useFadeIn(delay = 0) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    opacity.value = withDelay(delay, withSpring(1, springs.smooth));
    scale.value = withDelay(delay, withSpring(1, springs.smooth));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
}

/**
 * Hook for pulse animation
 */
export function usePulseAnimation(active = true) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pulse(scale);
    } else {
      scale.value = withSpring(1, springs.smooth);
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
}

/**
 * Hook for glow animation
 */
export function useGlowAnimation(active = true) {
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (active) {
      glowPulse(glowOpacity);
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return { animatedStyle, glowOpacity };
}

/**
 * Hook for shimmer loading animation
 */
export function useShimmerAnimation() {
  const progress = useSharedValue(0);

  useEffect(() => {
    shimmer(progress);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [-200, 200]);
    return {
      transform: [{ translateX }],
    };
  });

  return animatedStyle;
}

/**
 * Hook for progress animation
 */
export function useProgressAnimation(targetProgress: number) {
  const progress = useSharedValue(0);

  useEffect(() => {
    animateProgress(progress, targetProgress);
  }, [targetProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return { progress, animatedStyle };
}

/**
 * Hook for staggered list animation
 */
export function useStaggeredList(itemCount: number, baseDelay = 50) {
  const animations = Array.from({ length: itemCount }, (_, index) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
      const delay = getStaggerDelay(index, baseDelay);
      opacity.value = withDelay(delay, withSpring(1, springs.smooth));
      translateY.value = withDelay(delay, withSpring(0, springs.smooth));
    }, []);

    return useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    }));
  });

  return animations;
}

// =============================================================================
// LAYOUT ANIMATIONS
// =============================================================================

import { Layout } from 'react-native-reanimated';

// Smooth layout animation for list reordering
export const smoothLayout = Layout.springify().damping(15).stiffness(150);

// Quick layout for fast changes
export const quickLayout = Layout.duration(200);

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  springs,
  timings,
  easings,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  pressIn,
  pressOut,
  shake,
  pulse,
  glowPulse,
  popIn,
  getStaggerDelay,
  drawCheckmark,
  animateProgress,
  shimmer,
  interpolateFade,
  interpolateScale,
  interpolateSlide,
  screenEnter,
  screenExit,
  modalEnter,
  modalExit,
  listItemEnter,
  listItemExit,
  cardEnter,
  cardExit,
  bounceEnter,
  bounceExit,
  smoothLayout,
  quickLayout,
};
