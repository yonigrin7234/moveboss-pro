/**
 * SwipeableActionCard - Swipe to perform actions quickly
 *
 * Features:
 * - Swipe right to execute primary action (1 tap equivalent)
 * - Swipe left to view details
 * - Long press for quick actions menu
 * - Haptic feedback on actions
 * - Animated reveal of action indicators
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

const SWIPE_THRESHOLD = 100;
const ACTION_WIDTH = 80;

interface SwipeableActionCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
  rightActionLabel?: string;
  rightActionColor?: string;
  rightActionIcon?: string;
  leftActionLabel?: string;
  leftActionColor?: string;
  leftActionIcon?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function SwipeableActionCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  onPress,
  onLongPress,
  rightActionLabel = 'Start',
  rightActionColor = colors.success,
  rightActionIcon = '→',
  leftActionLabel = 'Details',
  leftActionColor = colors.primary,
  leftActionIcon = '···',
  disabled = false,
  style,
}: SwipeableActionCardProps) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const isActive = useSharedValue(false);

  const executeRightAction = useCallback(() => {
    if (onSwipeRight && !disabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSwipeRight();
    }
  }, [onSwipeRight, disabled]);

  const executeLeftAction = useCallback(() => {
    if (onSwipeLeft && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSwipeLeft();
    }
  }, [onSwipeLeft, disabled]);

  const handlePress = useCallback(() => {
    if (onPress && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [onPress, disabled]);

  const handleLongPress = useCallback(() => {
    if (onLongPress && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onLongPress();
    }
  }, [onLongPress, disabled]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      startX.value = translateX.value;
      isActive.value = true;
    })
    .onUpdate((event) => {
      // Limit swipe distance
      const maxRight = onSwipeRight ? SWIPE_THRESHOLD * 1.5 : 0;
      const maxLeft = onSwipeLeft ? -SWIPE_THRESHOLD * 1.5 : 0;

      translateX.value = Math.max(maxLeft, Math.min(maxRight, startX.value + event.translationX));

      // Haptic at threshold
      if (Math.abs(translateX.value) >= SWIPE_THRESHOLD && Math.abs(startX.value + event.translationX - SWIPE_THRESHOLD) < 5) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd((event) => {
      isActive.value = false;

      // Check if threshold crossed
      if (translateX.value >= SWIPE_THRESHOLD && onSwipeRight) {
        runOnJS(executeRightAction)();
      } else if (translateX.value <= -SWIPE_THRESHOLD && onSwipeLeft) {
        runOnJS(executeLeftAction)();
      }

      // Snap back
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(handleLongPress)();
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handlePress)();
  });

  const composedGesture = Gesture.Race(
    panGesture,
    Gesture.Exclusive(longPressGesture, tapGesture)
  );

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rightActionStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity: progress,
      transform: [
        { scale: interpolate(progress, [0, 1], [0.8, 1]) },
      ],
    };
  });

  const leftActionStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, -SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity: progress,
      transform: [
        { scale: interpolate(progress, [0, 1], [0.8, 1]) },
      ],
    };
  });

  const rightCheckStyle = useAnimatedStyle(() => {
    const isTriggered = translateX.value >= SWIPE_THRESHOLD;

    return {
      opacity: isTriggered ? 1 : 0.5,
      transform: [
        { scale: withSpring(isTriggered ? 1.2 : 1, { damping: 15 }) },
      ],
    };
  });

  const leftCheckStyle = useAnimatedStyle(() => {
    const isTriggered = translateX.value <= -SWIPE_THRESHOLD;

    return {
      opacity: isTriggered ? 1 : 0.5,
      transform: [
        { scale: withSpring(isTriggered ? 1.2 : 1, { damping: 15 }) },
      ],
    };
  });

  return (
    <View style={[styles.container, style]}>
      {/* Right action (swipe right to reveal) */}
      {onSwipeRight && (
        <Animated.View
          style={[
            styles.actionContainer,
            styles.rightAction,
            { backgroundColor: rightActionColor },
            rightActionStyle,
          ]}
        >
          <Animated.View style={rightCheckStyle}>
            <Text style={styles.actionIcon}>{rightActionIcon}</Text>
          </Animated.View>
          <Text style={styles.actionLabel}>{rightActionLabel}</Text>
        </Animated.View>
      )}

      {/* Left action (swipe left to reveal) */}
      {onSwipeLeft && (
        <Animated.View
          style={[
            styles.actionContainer,
            styles.leftAction,
            { backgroundColor: leftActionColor },
            leftActionStyle,
          ]}
        >
          <Animated.View style={leftCheckStyle}>
            <Text style={styles.actionIcon}>{leftActionIcon}</Text>
          </Animated.View>
          <Text style={styles.actionLabel}>{leftActionLabel}</Text>
        </Animated.View>
      )}

      {/* Main card content */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
  },
  rightAction: {
    left: 0,
  },
  leftAction: {
    right: 0,
  },
  actionIcon: {
    fontSize: 24,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  actionLabel: {
    ...typography.label,
    color: colors.white,
    fontSize: 10,
  },
});

export default SwipeableActionCard;
