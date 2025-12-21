'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseTabNotificationOptions {
  /** Base title for the page */
  baseTitle?: string;
  /** Number of unread/critical items */
  count: number;
  /** Whether to flash the title for attention */
  flash?: boolean;
  /** Flash interval in milliseconds */
  flashInterval?: number;
  /** Message to show when flashing (alternates with count title) */
  flashMessage?: string;
  /** Whether the tab notification is enabled */
  enabled?: boolean;
}

/**
 * Hook to update browser tab title with notification count
 * - Shows "(3) MoveBoss Pro" format for unread items
 * - Can flash between messages to grab attention
 * - Resets when tab gains focus
 */
export function useTabNotification({
  baseTitle = 'MoveBoss Pro',
  count,
  flash = false,
  flashInterval = 1000,
  flashMessage = 'New Alert!',
  enabled = true,
}: UseTabNotificationOptions) {
  const originalTitleRef = useRef<string>('');
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFlashingRef = useRef(false);
  const showingCountRef = useRef(true);

  // Update document title
  const updateTitle = useCallback((title: string) => {
    if (typeof document !== 'undefined') {
      document.title = title;
    }
  }, []);

  // Get the title with count prefix
  const getTitleWithCount = useCallback(() => {
    if (count > 0) {
      return `(${count}) ${baseTitle}`;
    }
    return baseTitle;
  }, [count, baseTitle]);

  // Stop flashing
  const stopFlashing = useCallback(() => {
    if (flashTimerRef.current) {
      clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    isFlashingRef.current = false;
    showingCountRef.current = true;
  }, []);

  // Start flashing
  const startFlashing = useCallback(() => {
    if (isFlashingRef.current) return;

    isFlashingRef.current = true;
    showingCountRef.current = true;

    flashTimerRef.current = setInterval(() => {
      showingCountRef.current = !showingCountRef.current;
      updateTitle(showingCountRef.current ? getTitleWithCount() : flashMessage);
    }, flashInterval);
  }, [getTitleWithCount, flashMessage, flashInterval, updateTitle]);

  // Handle visibility change (tab focus)
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab is focused, stop flashing and show normal title
        stopFlashing();
        updateTitle(getTitleWithCount());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, stopFlashing, updateTitle, getTitleWithCount]);

  // Update title when count changes
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    // Store original title on first mount
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }

    // Update title with count
    if (!isFlashingRef.current) {
      updateTitle(getTitleWithCount());
    }

    // Start/stop flashing based on flash prop
    if (flash && count > 0 && document.visibilityState !== 'visible') {
      startFlashing();
    } else if (!flash || count === 0) {
      stopFlashing();
      updateTitle(getTitleWithCount());
    }

    // Cleanup on unmount
    return () => {
      stopFlashing();
      if (originalTitleRef.current) {
        updateTitle(originalTitleRef.current);
      }
    };
  }, [enabled, count, flash, getTitleWithCount, startFlashing, stopFlashing, updateTitle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopFlashing();
    };
  }, [stopFlashing]);

  return {
    /** Manually stop flashing */
    stopFlashing,
    /** Manually start flashing */
    startFlashing,
    /** Whether currently flashing */
    isFlashing: isFlashingRef.current,
  };
}

/**
 * Hook to show a favicon badge (notification dot)
 * Note: This requires a canvas-based approach and may not work in all browsers
 */
export function useFaviconBadge(count: number, enabled = true) {
  const originalFaviconRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || typeof document === 'undefined' || count <= 0) {
      return;
    }

    // Get the current favicon
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) return;

    if (!originalFaviconRef.current) {
      originalFaviconRef.current = link.href;
    }

    // Create a canvas to draw the badge
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load the original favicon
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw original favicon
      ctx.drawImage(img, 0, 0, 32, 32);

      // Draw badge circle
      ctx.beginPath();
      ctx.arc(24, 8, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444'; // red-500
      ctx.fill();

      // Draw count text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count > 9 ? '9+' : String(count), 24, 8);

      // Update favicon
      link.href = canvas.toDataURL('image/png');
    };
    img.src = originalFaviconRef.current;

    // Cleanup
    return () => {
      if (originalFaviconRef.current && link) {
        link.href = originalFaviconRef.current;
      }
    };
  }, [count, enabled]);
}
