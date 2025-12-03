/**
 * PremiumInput - Beautiful text input with floating label animation
 *
 * Features:
 * - Floating label animation (moves up on focus/value)
 * - Focus glow effect with animated border
 * - Inline error with shake animation
 * - Character count for maxLength
 * - Auto-clear button
 * - Secure text toggle for passwords
 * - Left/right icon slots
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius } from '../../lib/theme';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);

interface PremiumInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showClearButton?: boolean;
  showCharacterCount?: boolean;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

export function PremiumInput({
  label,
  value,
  onChangeText,
  error,
  helperText,
  leftIcon,
  rightIcon,
  showClearButton = false,
  showCharacterCount = false,
  maxLength,
  containerStyle,
  disabled = false,
  secureTextEntry,
  ...textInputProps
}: PremiumInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const focusAnim = useSharedValue(0);
  const labelPosition = useSharedValue(value ? 1 : 0);
  const shakeAnim = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  // Shake animation on error
  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeAnim.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [error]);

  // Update label position when value changes
  useEffect(() => {
    if (value || isFocused) {
      labelPosition.value = withSpring(1, SPRING_CONFIG);
    } else {
      labelPosition.value = withSpring(0, SPRING_CONFIG);
    }
  }, [value, isFocused]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    focusAnim.value = withSpring(1, SPRING_CONFIG);
    glowOpacity.value = withSpring(1, SPRING_CONFIG);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    focusAnim.value = withSpring(0, SPRING_CONFIG);
    glowOpacity.value = withSpring(0, SPRING_CONFIG);
  }, []);

  const handleClear = useCallback(() => {
    onChangeText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.focus();
  }, [onChangeText]);

  const toggleSecure = useCallback(() => {
    setIsSecure(!isSecure);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isSecure]);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));

  const borderAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? colors.error
      : interpolateColor(
          focusAnim.value,
          [0, 1],
          [colors.border, colors.primary]
        );

    return {
      borderColor,
      borderWidth: interpolate(focusAnim.value, [0, 1], [1, 2]),
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: error ? 0.3 : glowOpacity.value * 0.2,
    backgroundColor: error ? colors.error : colors.primary,
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      labelPosition.value,
      [0, 1],
      [0, -24],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      labelPosition.value,
      [0, 1],
      [1, 0.85],
      Extrapolation.CLAMP
    );

    const labelColor = error
      ? colors.error
      : interpolateColor(
          focusAnim.value,
          [0, 1],
          [colors.textMuted, colors.primary]
        );

    return {
      transform: [{ translateY }, { scale }],
      color: labelColor,
    };
  });

  const hasValue = value.length > 0;
  const showClear = showClearButton && hasValue && !disabled;
  const showSecureToggle = secureTextEntry !== undefined;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <AnimatedView style={[styles.container, containerAnimatedStyle]}>
        {/* Glow effect */}
        <AnimatedView style={[styles.glow, glowAnimatedStyle]} />

        {/* Input container */}
        <AnimatedView style={[styles.inputContainer, borderAnimatedStyle]}>
          {/* Left icon */}
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

          {/* Input field */}
          <View style={styles.inputWrapper}>
            <AnimatedText
              style={[styles.label, labelAnimatedStyle]}
              onPress={() => inputRef.current?.focus()}
            >
              {label}
            </AnimatedText>

            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                leftIcon ? styles.inputWithLeftIcon : undefined,
                (showClear || showSecureToggle || rightIcon)
                  ? styles.inputWithRightIcon
                  : undefined,
                disabled ? styles.inputDisabled : undefined,
              ]}
              value={value}
              onChangeText={onChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              editable={!disabled}
              secureTextEntry={isSecure}
              maxLength={maxLength}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              {...textInputProps}
              accessibilityLabel={label}
              accessibilityState={{ disabled }}
            />
          </View>

          {/* Right icons */}
          <View style={styles.rightIcons}>
            {showClear && (
              <Pressable
                onPress={handleClear}
                style={styles.iconButton}
                accessibilityLabel="Clear input"
                accessibilityRole="button"
              >
                <Text style={styles.clearIcon}>✕</Text>
              </Pressable>
            )}

            {showSecureToggle && (
              <Pressable
                onPress={toggleSecure}
                style={styles.iconButton}
                accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
                accessibilityRole="button"
              >
                <Text style={styles.secureIcon}>{isSecure ? '👁' : '👁‍🗨'}</Text>
              </Pressable>
            )}

            {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
          </View>
        </AnimatedView>
      </AnimatedView>

      {/* Helper text / Error / Character count */}
      <View style={styles.footer}>
        {(error || helperText) && (
          <Text style={[styles.helperText, error && styles.errorText]}>
            {error || helperText}
          </Text>
        )}

        {showCharacterCount && maxLength && (
          <Text
            style={[
              styles.characterCount,
              value.length >= maxLength && styles.characterCountLimit,
            ]}
          >
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  container: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: radius.input + 2,
    zIndex: -1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: radius.input,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: spacing.md,
  },
  label: {
    position: 'absolute',
    left: 0,
    top: 18,
    ...typography.body,
    color: colors.textMuted,
    backgroundColor: 'transparent',
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
    height: 24,
  },
  inputWithLeftIcon: {
    marginLeft: spacing.sm,
  },
  inputWithRightIcon: {
    marginRight: spacing.sm,
  },
  inputDisabled: {
    color: colors.textMuted,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  clearIcon: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  secureIcon: {
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  errorText: {
    color: colors.error,
  },
  characterCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
  characterCountLimit: {
    color: colors.warning,
  },
});

export default PremiumInput;
