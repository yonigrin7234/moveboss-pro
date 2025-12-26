import { Platform } from 'react-native';
import * as types from './ActivityController.types';

// Get the native module - will be null on Android or when not compiled
let nativeModule: any = null;

if (Platform.OS === 'ios') {
  try {
    // Dynamic import to avoid crash when module isn't compiled
    const { requireNativeModule } = require('expo-modules-core');
    nativeModule = requireNativeModule('ActivityController');
  } catch (e) {
    // Module not available - running in Expo Go or not yet compiled
    console.log('[LiveActivity] Native module not available - rebuild iOS app to enable');
  }
}

/**
 * Whether Live Activities are enabled on this device
 * Returns false on Android or iOS versions < 16.2
 */
export const areLiveActivitiesEnabled: boolean =
  nativeModule?.areLiveActivitiesEnabled ?? false;

/**
 * Start a new Trip Live Activity
 * Shows on Lock Screen and Dynamic Island (iPhone 14 Pro+)
 */
export const startLiveActivity: types.StartLiveActivityFn = async (params) => {
  if (!nativeModule) {
    return { activityId: '' };
  }
  const stringParams = JSON.stringify(params);
  return nativeModule.startLiveActivity(stringParams);
};

/**
 * Update the current Live Activity with new content state
 */
export const updateLiveActivity: types.UpdateLiveActivityFn = async (params) => {
  if (!nativeModule) {
    return;
  }
  const stringParams = JSON.stringify(params);
  return nativeModule.updateLiveActivity(stringParams);
};

/**
 * Stop the current Live Activity
 */
export const stopLiveActivity: types.StopLiveActivityFn = async () => {
  if (!nativeModule) {
    return;
  }
  return nativeModule.stopLiveActivity();
};

/**
 * Check if a Live Activity is currently running
 */
export const isLiveActivityRunning: types.IsLiveActivityRunningFn = () => {
  if (!nativeModule) {
    return false;
  }
  return nativeModule.isLiveActivityRunning();
};
