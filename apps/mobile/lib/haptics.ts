/**
 * Haptic Feedback System
 *
 * Centralized haptic feedback utilities for a tactile, premium app experience.
 * Every interaction should have appropriate haptic feedback.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Check if haptics are supported (iOS always, Android varies)
const isHapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Safe haptic wrapper - gracefully handles unsupported platforms
 */
async function safeHaptic(hapticFn: () => Promise<void>) {
  if (!isHapticsSupported) return;
  try {
    await hapticFn();
  } catch {
    // Silently fail if haptics aren't available
  }
}

/**
 * Core haptic patterns
 */
export const haptics = {
  // ==========================================================================
  // IMPACT FEEDBACK - Physical button-like sensations
  // ==========================================================================

  /**
   * Light tap - for all standard button presses
   * Use for: buttons, list items, toggles, checkboxes
   */
  tap: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /**
   * Medium impact - for important actions
   * Use for: primary buttons, confirming actions, starting workflows
   */
  action: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /**
   * Heavy impact - for confirmations and completions
   * Use for: completing important flows, confirming destructive actions
   */
  confirm: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),

  /**
   * Soft impact - for subtle feedback
   * Use for: hover states, drag interactions, subtle UI changes
   */
  soft: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),

  /**
   * Rigid impact - for firm, definite feedback
   * Use for: snapping into place, reaching limits
   */
  rigid: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),

  // ==========================================================================
  // NOTIFICATION FEEDBACK - System-level notifications
  // ==========================================================================

  /**
   * Success - task completed successfully
   * Use for: form submissions, payments collected, deliveries completed
   */
  success: () => safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /**
   * Error - something went wrong
   * Use for: validation errors, failed actions, network errors
   */
  error: () => safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),

  /**
   * Warning - attention needed
   * Use for: warnings, confirmations before destructive actions
   */
  warning: () => safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),

  // ==========================================================================
  // SELECTION FEEDBACK - UI element selection
  // ==========================================================================

  /**
   * Selection - UI element was selected
   * Use for: picker changes, tab switches, segment changes, radio buttons
   */
  selection: () => safeHaptic(() => Haptics.selectionAsync()),

  // ==========================================================================
  // COMPOSITE PATTERNS - Multi-haptic sequences for special moments
  // ==========================================================================

  /**
   * Celebration - for major achievements
   * Use for: trip completed, all deliveries done, milestone reached
   */
  celebration: async () => {
    await safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    await delay(100);
    await safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    await delay(100);
    await safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    await delay(100);
    await safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },

  /**
   * Payment collected - money in hand feeling
   * Use for: payment collection confirmation
   */
  paymentCollected: async () => {
    await safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    await delay(150);
    await safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },

  /**
   * Swipe threshold crossed - user has swiped far enough
   * Use for: swipe-to-delete, swipe actions
   */
  swipeThreshold: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /**
   * Pull-to-refresh triggered
   * Use for: when pull-to-refresh activates
   */
  pullRefresh: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /**
   * Long press activated
   * Use for: context menus, drag-to-reorder start
   */
  longPress: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /**
   * Snap - element snapped into position
   * Use for: bottom sheets, carousels, snap points
   */
  snap: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),

  /**
   * Drag tick - continuous feedback during drag
   * Use for: sliders, progress changes (call sparingly)
   */
  dragTick: () => safeHaptic(() => Haptics.selectionAsync()),

  /**
   * Delete - item removed
   * Use for: delete confirmations
   */
  delete: async () => {
    await safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },

  /**
   * Countdown tick - for countdowns before action
   * Use for: trip start countdown
   */
  countdownTick: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /**
   * Triple tap - attention grabbing
   * Use for: urgent notifications, errors that need attention
   */
  attention: async () => {
    await safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    await delay(80);
    await safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    await delay(80);
    await safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
};

/**
 * Helper function for delays between haptics
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Haptic presets for common UI components
 */
export const componentHaptics = {
  button: {
    primary: haptics.action,
    secondary: haptics.tap,
    ghost: haptics.tap,
    danger: haptics.warning,
  },
  card: {
    press: haptics.tap,
    longPress: haptics.longPress,
  },
  list: {
    itemPress: haptics.tap,
    swipeThreshold: haptics.swipeThreshold,
    delete: haptics.delete,
  },
  navigation: {
    tabChange: haptics.selection,
    back: haptics.tap,
    modalOpen: haptics.action,
    modalClose: haptics.tap,
  },
  form: {
    submit: haptics.action,
    success: haptics.success,
    error: haptics.error,
    inputFocus: haptics.selection,
    pickerChange: haptics.selection,
    toggleChange: haptics.selection,
  },
  refresh: {
    trigger: haptics.pullRefresh,
  },
  workflow: {
    stepComplete: haptics.success,
    paymentCollected: haptics.paymentCollected,
    tripComplete: haptics.celebration,
    deliveryComplete: haptics.celebration,
    loadComplete: haptics.success,
  },
};

export default haptics;
