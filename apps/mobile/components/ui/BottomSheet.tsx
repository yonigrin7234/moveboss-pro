/**
 * BottomSheet - Premium bottom sheet with blur backdrop
 *
 * Features:
 * - Drag handle with haptic feedback
 * - Configurable snap points
 * - Blur backdrop option
 * - Smooth spring animations
 * - Header with title and close button
 * - Safe area handling
 */

import React, { useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import GorhomBottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetHandle,
  BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../../lib/theme';

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
  snapTo: (index: number) => void;
}

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  title?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  onChange?: (index: number) => void;
  enablePanDownToClose?: boolean;
  enableBlurBackdrop?: boolean;
  enableDynamicSizing?: boolean;
  headerRight?: React.ReactNode;
  style?: ViewStyle;
}

// Custom handle with premium styling
function PremiumHandle(props: BottomSheetHandleProps) {
  const handleStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        props.animatedIndex.value,
        [-1, 0],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <Animated.View style={[styles.handleContainer, handleStyle]}>
      <View style={styles.handle} />
    </Animated.View>
  );
}

// Custom backdrop with optional blur
function CustomBackdrop(props: BottomSheetBackdropProps & { enableBlur?: boolean }) {
  const { enableBlur, ...backdropProps } = props;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      props.animatedIndex.value,
      [-1, 0],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  if (enableBlur) {
    return (
      <Animated.View
        style={[StyleSheet.absoluteFill, animatedStyle]}
      >
        <BlurView
          intensity={20}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <BottomSheetBackdrop
          {...backdropProps}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      </Animated.View>
    );
  }

  return (
    <BottomSheetBackdrop
      {...backdropProps}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.7}
    />
  );
}

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  (
    {
      children,
      snapPoints: customSnapPoints,
      title,
      showCloseButton = true,
      onClose,
      onChange,
      enablePanDownToClose = true,
      enableBlurBackdrop = true,
      enableDynamicSizing = false,
      headerRight,
      style,
    },
    ref
  ) => {
    const bottomSheetRef = useRef<GorhomBottomSheet>(null);

    // Default snap points
    const snapPoints = useMemo(
      () => customSnapPoints || ['50%', '90%'],
      [customSnapPoints]
    );

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      open: () => {
        bottomSheetRef.current?.snapToIndex(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      close: () => {
        bottomSheetRef.current?.close();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      snapTo: (index: number) => {
        bottomSheetRef.current?.snapToIndex(index);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    }));

    const handleSheetChange = useCallback(
      (index: number) => {
        if (index >= 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onChange?.(index);
        if (index === -1) {
          onClose?.();
        }
      },
      [onChange, onClose]
    );

    const handleClose = useCallback(() => {
      bottomSheetRef.current?.close();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <CustomBackdrop {...props} enableBlur={enableBlurBackdrop} />
      ),
      [enableBlurBackdrop]
    );

    const renderHandle = useCallback(
      (props: BottomSheetHandleProps) => <PremiumHandle {...props} />,
      []
    );

    const hasHeader = title || showCloseButton || headerRight;

    return (
      <GorhomBottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={enableDynamicSizing ? undefined : snapPoints}
        enableDynamicSizing={enableDynamicSizing}
        enablePanDownToClose={enablePanDownToClose}
        onChange={handleSheetChange}
        backdropComponent={renderBackdrop}
        handleComponent={renderHandle}
        backgroundStyle={styles.background}
        style={[styles.sheet, style]}
        animationConfigs={{
          damping: 20,
          stiffness: 200,
          mass: 0.5,
        }}
      >
        <BottomSheetView style={styles.contentContainer}>
          {/* Header */}
          {hasHeader && (
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {title && <Text style={styles.title}>{title}</Text>}
              </View>
              <View style={styles.headerRight}>
                {headerRight}
                {showCloseButton && (
                  <Pressable
                    onPress={handleClose}
                    style={styles.closeButton}
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                  >
                    <Text style={styles.closeIcon}>✕</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>{children}</View>
        </BottomSheetView>
      </GorhomBottomSheet>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  sheet: {
    zIndex: 1000,
  },
  background: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.headline,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  closeIcon: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});

export default BottomSheet;
