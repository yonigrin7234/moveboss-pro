/**
 * useSoundSettings - Hook for managing sound preferences
 *
 * Usage:
 * const { soundsEnabled, toggleSounds, soundsAvailable } = useSoundSettings();
 */

import { useState, useEffect, useCallback } from 'react';
import { soundSettings } from '../lib/sounds';

export function useSoundSettings() {
  const [soundsEnabled, setSoundsEnabled] = useState(soundSettings.isEnabled());
  const [soundsAvailable, setSoundsAvailable] = useState(soundSettings.isAvailable());

  // Sync state with module state
  useEffect(() => {
    const interval = setInterval(() => {
      setSoundsEnabled(soundSettings.isEnabled());
      setSoundsAvailable(soundSettings.isAvailable());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const enableSounds = useCallback(async () => {
    await soundSettings.enable();
    setSoundsEnabled(true);
  }, []);

  const disableSounds = useCallback(async () => {
    await soundSettings.disable();
    setSoundsEnabled(false);
  }, []);

  const toggleSounds = useCallback(async () => {
    const newState = await soundSettings.toggle();
    setSoundsEnabled(newState);
    return newState;
  }, []);

  return {
    soundsEnabled,
    soundsAvailable,
    enableSounds,
    disableSounds,
    toggleSounds,
  };
}

export default useSoundSettings;
