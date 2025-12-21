'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseNotificationSoundOptions {
  /** Whether sound is enabled */
  enabled?: boolean;
  /** Volume level (0-1) */
  volume?: number;
  /** Sound file URL (defaults to a simple beep) */
  soundUrl?: string;
}

/**
 * Hook to play notification sounds
 * Uses Web Audio API for reliable playback
 */
export function useNotificationSound({
  enabled = true,
  volume = 0.5,
  soundUrl,
}: UseNotificationSoundOptions = {}) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize audio context on first interaction
  const initAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }

    // Resume if suspended (browsers require user interaction)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  // Play a simple beep sound using oscillator
  const playBeep = useCallback(
    (frequency = 800, duration = 150) => {
      if (!enabled) return;

      const ctx = initAudioContext();
      if (!ctx || !gainNodeRef.current) return;

      try {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        // Fade in and out to avoid clicks
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration / 1000);
      } catch (error) {
        console.warn('Failed to play notification sound:', error);
      }
    },
    [enabled, volume, initAudioContext]
  );

  // Play a double beep for more attention
  const playDoubleBeep = useCallback(() => {
    if (!enabled) return;

    playBeep(800, 100);
    setTimeout(() => playBeep(1000, 100), 150);
  }, [enabled, playBeep]);

  // Play a custom sound file
  const playSound = useCallback(
    async (url?: string) => {
      if (!enabled) return;

      const soundToPlay = url || soundUrl;
      if (!soundToPlay) {
        playDoubleBeep();
        return;
      }

      try {
        const audio = new Audio(soundToPlay);
        audio.volume = volume;
        await audio.play();
      } catch (error) {
        console.warn('Failed to play custom sound, falling back to beep:', error);
        playDoubleBeep();
      }
    },
    [enabled, volume, soundUrl, playDoubleBeep]
  );

  // Play alert sound (more urgent, higher pitch pattern)
  const playAlert = useCallback(() => {
    if (!enabled) return;

    playBeep(1000, 100);
    setTimeout(() => playBeep(1200, 100), 120);
    setTimeout(() => playBeep(1000, 100), 240);
  }, [enabled, playBeep]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    /** Play a simple beep */
    playBeep,
    /** Play a double beep */
    playDoubleBeep,
    /** Play a custom sound file or default beep */
    playSound,
    /** Play an alert pattern (more urgent) */
    playAlert,
    /** Initialize audio context (call on user interaction) */
    initAudioContext,
  };
}

/**
 * Storage key for sound preference
 */
const SOUND_PREFERENCE_KEY = 'moveboss_notification_sound_enabled';

/**
 * Hook to manage notification sound preference
 */
export function useNotificationSoundPreference() {
  const getPreference = useCallback((): boolean => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(SOUND_PREFERENCE_KEY);
    return stored !== 'false'; // Default to enabled
  }, []);

  const setPreference = useCallback((enabled: boolean) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled));
  }, []);

  return { getPreference, setPreference };
}
