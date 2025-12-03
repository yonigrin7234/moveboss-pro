/**
 * Toast - Premium toast notifications
 *
 * Features:
 * - Slides in from top with spring animation
 * - Auto-dismiss with configurable duration
 * - Success/error/info/warning variants
 * - Swipe to dismiss
 * - Haptic feedback
 * - Action button support
 * - Queue management for multiple toasts
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { haptics } from '../../lib/haptics';
import { Icon, IconName } from './Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_OFFSET = 60;
const DISMISS_THRESHOLD = 100;

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  showToast: (
    message: string,
    variant?: ToastVariant,
    options?: {
      duration?: number;
      action?: { label: string; onPress: () => void };
    }
  ) => void;
  hideToast: (id: string) => void;
  success: (message: string, options?: { duration?: number }) => void;
  error: (message: string, options?: { duration?: number }) => void;
  warning: (message: string, options?: { duration?: number }) => void;
  info: (message: string, options?: { duration?: number }) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast Item Component
interface ToastItemProps {
  toast: ToastConfig;
  onDismiss: (id: string) => void;
  index: number;
}

function ToastItem({ toast, onDismiss, index }: ToastItemProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-TOAST_OFFSET);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const dismissToast = useCallback(() => {
    translateY.value = withTiming(-TOAST_OFFSET, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)(toast.id);
    });
  }, [toast.id, onDismiss]);

  useEffect(() => {
    // Entrance animation
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    opacity.value = withSpring(1, { damping: 20, stiffness: 300 });
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });

    // Haptic feedback based on variant
    if (toast.variant === 'success') {
      haptics.success();
    } else if (toast.variant === 'error') {
      haptics.error();
    } else if (toast.variant === 'warning') {
      haptics.warning();
    } else {
      haptics.tap();
    }

    // Auto dismiss
    const duration = toast.duration || 4000;
    const timer = setTimeout(() => {
      dismissToast();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = Math.min(0, startY.value + event.translationY);
    })
    .onEnd((event) => {
      // Swipe up to dismiss
      if (event.translationY < -50 || event.velocityY < -500) {
        translateY.value = withTiming(-TOAST_OFFSET, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)(toast.id);
        });
        return;
      }

      // Swipe left/right to dismiss
      if (
        Math.abs(event.translationX) > DISMISS_THRESHOLD ||
        Math.abs(event.velocityX) > 500
      ) {
        const direction = event.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(direction * SCREEN_WIDTH, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)(toast.id);
        });
        return;
      }

      // Snap back
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const variantStyles = getVariantStyles(toast.variant);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.toast,
          variantStyles.container,
          { marginTop: index === 0 ? insets.top + spacing.sm : spacing.sm },
          animatedStyle,
        ]}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, variantStyles.iconContainer]}>
          <Icon name={variantStyles.icon} size="sm" color={variantStyles.iconColor} strokeWidth={2.5} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>

        {/* Action button */}
        {toast.action && (
          <Pressable
            onPress={() => {
              toast.action?.onPress();
              dismissToast();
            }}
            style={styles.actionButton}
          >
            <Text style={[styles.actionText, variantStyles.actionText]}>
              {toast.action.label}
            </Text>
          </Pressable>
        )}

        {/* Close button */}
        <Pressable
          onPress={dismissToast}
          style={styles.closeButton}
          accessibilityLabel="Dismiss"
        >
          <Icon name="x" size="xs" color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

function getVariantStyles(variant: ToastVariant): {
  container: ViewStyle;
  iconContainer: ViewStyle;
  icon: IconName;
  iconColor: string;
  actionText: { color: string };
} {
  const variants = {
    success: {
      container: {
        backgroundColor: colors.surface,
        borderLeftColor: colors.success,
      } as ViewStyle,
      iconContainer: {
        backgroundColor: colors.successSoft,
      } as ViewStyle,
      icon: 'check' as IconName,
      iconColor: colors.success,
      actionText: { color: colors.success },
    },
    error: {
      container: {
        backgroundColor: colors.surface,
        borderLeftColor: colors.error,
      } as ViewStyle,
      iconContainer: {
        backgroundColor: colors.errorSoft,
      } as ViewStyle,
      icon: 'x' as IconName,
      iconColor: colors.error,
      actionText: { color: colors.error },
    },
    warning: {
      container: {
        backgroundColor: colors.surface,
        borderLeftColor: colors.warning,
      } as ViewStyle,
      iconContainer: {
        backgroundColor: colors.warningSoft,
      } as ViewStyle,
      icon: 'alert-triangle' as IconName,
      iconColor: colors.warning,
      actionText: { color: colors.warning },
    },
    info: {
      container: {
        backgroundColor: colors.surface,
        borderLeftColor: colors.info,
      } as ViewStyle,
      iconContainer: {
        backgroundColor: colors.infoSoft,
      } as ViewStyle,
      icon: 'info' as IconName,
      iconColor: colors.info,
      actionText: { color: colors.info },
    },
  };

  return variants[variant];
}

// Toast Provider Component
interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  const idCounter = useRef(0);

  const showToast = useCallback(
    (
      message: string,
      variant: ToastVariant = 'info',
      options?: {
        duration?: number;
        action?: { label: string; onPress: () => void };
      }
    ) => {
      const id = `toast-${idCounter.current++}`;
      const newToast: ToastConfig = {
        id,
        message,
        variant,
        duration: options?.duration,
        action: options?.action,
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 3)); // Max 3 toasts
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Convenience methods
  const success = useCallback(
    (message: string, options?: { duration?: number }) => {
      showToast(message, 'success', options);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, options?: { duration?: number }) => {
      showToast(message, 'error', options);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, options?: { duration?: number }) => {
      showToast(message, 'warning', options);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, options?: { duration?: number }) => {
      showToast(message, 'info', options);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{ showToast, hideToast, success, error, warning, info }}
    >
      {children}

      {/* Toast container */}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={hideToast}
            index={index}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
    maxWidth: SCREEN_WIDTH - spacing.lg * 2,
    minWidth: SCREEN_WIDTH - spacing.lg * 2,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  actionButton: {
    marginLeft: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    ...typography.buttonSmall,
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});

export default ToastProvider;
