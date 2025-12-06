/**
 * Sound Effects System
 *
 * Subtle, professional sound effects for key moments.
 * Respects system sound settings and can be disabled by user.
 *
 * SETUP: Add sound files to assets/sounds/ directory.
 * See assets/sounds/README.md for file requirements.
 * Until files are added, this module gracefully degrades to haptics-only.
 */

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptics } from './haptics';

// Storage key for sound settings
const SOUND_ENABLED_KEY = '@moveboss_sounds_enabled';

type SoundName = 'tap' | 'success' | 'complete' | 'error' | 'money' | 'notification';

// Preloaded sound objects
const loadedSounds: Partial<Record<SoundName, Audio.Sound>> = {};

// Sound enabled state (cached for performance)
let soundsEnabled = true;
let soundsAvailable = false;
let initialized = false;

/**
 * Sound file sources - loaded dynamically to handle missing files
 * Returns null if file doesn't exist
 */
function getSoundSource(name: SoundName): any | null {
  try {
    switch (name) {
      case 'tap':
        return require('../assets/sounds/tap.mp3');
      case 'success':
        return require('../assets/sounds/success.mp3');
      case 'complete':
        return require('../assets/sounds/complete.mp3');
      case 'error':
        return require('../assets/sounds/error.mp3');
      case 'money':
        return require('../assets/sounds/money.mp3');
      case 'notification':
        return require('../assets/sounds/notification.mp3');
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Initialize the sound system
 * Call this early in app lifecycle (e.g., in _layout.tsx)
 */
export async function initializeSounds(): Promise<void> {
  if (initialized) return;

  try {
    // Configure audio mode
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false, // Respect silent mode
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // Load sound preference
    const stored = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
    soundsEnabled = stored !== 'false'; // Default to enabled

    // Preload all sounds
    await preloadSounds();

    initialized = true;
  } catch (error) {
    console.warn('Failed to initialize sounds:', error);
    initialized = true; // Mark as initialized to prevent retries
  }
}

/**
 * Preload all sound files for instant playback
 */
async function preloadSounds(): Promise<void> {
  const soundNames: SoundName[] = ['tap', 'success', 'complete', 'error', 'money', 'notification'];
  let loadedCount = 0;

  const loadPromises = soundNames.map(async (name) => {
    const source = getSoundSource(name);
    if (!source) return;

    try {
      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: false,
        volume: 0.5, // Keep sounds subtle
      });
      loadedSounds[name] = sound;
      loadedCount++;
    } catch (error) {
      // Sound file missing or invalid - continue without it
    }
  });

  await Promise.all(loadPromises);

  // Mark sounds as available if at least one loaded
  soundsAvailable = loadedCount > 0;

  // Sound files optional - falls back to haptics only
}

/**
 * Play a sound by name
 */
async function playSound(name: SoundName): Promise<void> {
  if (!soundsEnabled || !initialized || !soundsAvailable) return;

  const sound = loadedSounds[name];
  if (!sound) return;

  try {
    // Reset to start if already played
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (error) {
    // Silently fail - haptics will still work
  }
}

/**
 * Sound effects with optional haptic pairing
 */
export const sounds = {
  /**
   * Subtle tap sound for button presses
   */
  tap: async (withHaptic = true) => {
    if (withHaptic) haptics.tap();
    await playSound('tap');
  },

  /**
   * Success chime for completed actions
   */
  success: async (withHaptic = true) => {
    if (withHaptic) haptics.success();
    await playSound('success');
  },

  /**
   * Achievement sound for major completions
   */
  complete: async (withHaptic = true) => {
    if (withHaptic) await haptics.celebration();
    await playSound('complete');
  },

  /**
   * Soft error tone
   */
  error: async (withHaptic = true) => {
    if (withHaptic) haptics.error();
    await playSound('error');
  },

  /**
   * Cash register / coin sound for payments
   */
  money: async (withHaptic = true) => {
    if (withHaptic) await haptics.paymentCollected();
    await playSound('money');
  },

  /**
   * Gentle notification ping
   */
  notification: async (withHaptic = true) => {
    if (withHaptic) haptics.tap();
    await playSound('notification');
  },
};

/**
 * Combined feedback for specific workflow moments
 */
export const feedback = {
  /**
   * Payment collected - money sound + celebration haptic
   */
  paymentCollected: async () => {
    await sounds.money(true);
  },

  /**
   * Trip completed - achievement sound + celebration
   */
  tripCompleted: async () => {
    await sounds.complete(true);
  },

  /**
   * Load delivered - success sound
   */
  loadDelivered: async () => {
    await sounds.success(true);
  },

  /**
   * Action completed - subtle success
   */
  actionComplete: async () => {
    await sounds.success(true);
  },

  /**
   * Error occurred - error sound
   */
  errorOccurred: async () => {
    await sounds.error(true);
  },

  /**
   * Button pressed - subtle tap
   */
  buttonPress: async () => {
    await sounds.tap(true);
  },

  /**
   * New notification received
   */
  notificationReceived: async () => {
    await sounds.notification(true);
  },
};

/**
 * Sound settings management
 */
export const soundSettings = {
  /**
   * Check if sounds are enabled
   */
  isEnabled: () => soundsEnabled,

  /**
   * Check if sound files are available
   */
  isAvailable: () => soundsAvailable,

  /**
   * Enable sounds
   */
  enable: async () => {
    soundsEnabled = true;
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, 'true');
  },

  /**
   * Disable sounds
   */
  disable: async () => {
    soundsEnabled = false;
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, 'false');
  },

  /**
   * Toggle sounds on/off
   */
  toggle: async () => {
    if (soundsEnabled) {
      await soundSettings.disable();
    } else {
      await soundSettings.enable();
    }
    return soundsEnabled;
  },
};

/**
 * Cleanup sounds when app is closing
 */
export async function unloadSounds(): Promise<void> {
  const unloadPromises = Object.values(loadedSounds).map(async (sound) => {
    try {
      await sound?.unloadAsync();
    } catch {
      // Ignore unload errors
    }
  });

  await Promise.all(unloadPromises);
}

export default sounds;
