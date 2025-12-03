/**
 * AnimatedListItem - Animated wrapper for list items
 *
 * Features:
 * - Staggered fade-in animation based on index
 * - Press scale animation
 * - Swipe to delete with slide-out animation
 * - Exit animation on delete
 */

import React, { useCallback, useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
  FadeInUp,
  FadeOutRight,
  Layout,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { springs, timings, getStaggerDelay } from '../../lib/animations';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  onPress?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
  baseDelay?: number;
  maxDelay?: number;
  deleteThreshold?: number;
  disabled?: boolean;
}

export function AnimatedListItem({
  children,
  index,
  onPress,
  onDelete,
  style,
  baseDelay = 50,
  maxDelay = 500,
  deleteThreshold = 80,
  disabled = false,
}: AnimatedListItemProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const startX = useSharedValue(0);
  const isDeleting = useSharedValue(false);

  // Press animation
  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(0.98, springs.snappy);
  }, [disabled]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(1, springs.snappy);
  }, [disabled]);

  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [disabled, onPress]);

  // Swipe to delete gesture
  const panGesture = Gesture.Pan()
    .enabled(!!onDelete && !disabled)
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      // Only allow swiping left
      const newX = startX.value + event.translationX;
      translateX.value = Math.min(0, newX);
    })
    .onEnd((event) => {
      // Check if swipe exceeds threshold
      if (Math.abs(translateX.value) > deleteThreshold || event.velocityX < -500) {
        // Trigger delete
        isDeleting.value = true;
        translateX.value = withTiming(-500, { duration: timings.normal });
        opacity.value = withTiming(0, { duration: timings.normal }, () => {
          if (onDelete) {
            runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
            runOnJS(onDelete)();
          }
        });
      } else {
        // Snap back
        translateX.value = withSpring(0, springs.smooth);
      }
    });

  // Tap gesture
  const tapGesture = Gesture.Tap()
    .enabled(!!onPress && !disabled)
    .onStart(() => {
      'worklet';
      scale.value = withSpring(0.98, springs.snappy);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, springs.snappy);
      if (onPress) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(onPress)();
      }
    });

  const composedGesture = onDelete
    ? Gesture.Race(panGesture, tapGesture)
    : tapGesture;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
    opacity: opacity.value,
  }));

  const delay = getStaggerDelay(index, baseDelay, maxDelay);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        entering={FadeInUp.delay(delay).springify().damping(15)}
        exiting={FadeOutRight.duration(200)}
        layout={Layout.springify().damping(15)}
        style={[styles.container, animatedStyle, style]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Simple animated container without gestures
 * For items that just need staggered fade-in
 */
interface AnimatedItemProps {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
  baseDelay?: number;
}

export function AnimatedItem({
  children,
  index,
  style,
  baseDelay = 50,
}: AnimatedItemProps) {
  const delay = getStaggerDelay(index, baseDelay);

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).springify().damping(15)}
      layout={Layout.springify().damping(15)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Hook for controlling list item visibility with animation
 */
export function useAnimatedListItem(index: number, baseDelay = 50) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    const delay = getStaggerDelay(index, baseDelay);
    opacity.value = withDelay(delay, withSpring(1, springs.smooth));
    translateY.value = withDelay(delay, withSpring(0, springs.smooth));
    scale.value = withDelay(delay, withSpring(1, springs.smooth));
  }, [index, baseDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return animatedStyle;
}

const styles = StyleSheet.create({
  container: {
    // Base container style
  },
});

export default AnimatedListItem;
