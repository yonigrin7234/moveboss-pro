/**
 * Android stub for Activity Controller
 * Live Activities are iOS-only, so these are no-ops
 */
import * as types from './ActivityController.types';

export const areLiveActivitiesEnabled: boolean = false;

export const startLiveActivity: types.StartLiveActivityFn = async () => {
  return { activityId: '' };
};

export const updateLiveActivity: types.UpdateLiveActivityFn = async () => {
  return;
};

export const stopLiveActivity: types.StopLiveActivityFn = async () => {
  return;
};

export const isLiveActivityRunning: types.IsLiveActivityRunningFn = () => {
  return false;
};
