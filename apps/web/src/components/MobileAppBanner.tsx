'use client';

import { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';

const STORAGE_KEY = 'moveboss-mobile-banner-dismissed';

export function MobileAppBanner() {
  const [show, setShow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if on mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
    };

    // Check if banner was dismissed
    const wasDismissed = localStorage.getItem(STORAGE_KEY);
    const mobile = checkMobile();

    setIsMobile(mobile);
    setShow(mobile && !wasDismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  if (!show || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">Get the MoveBoss App</p>
              <p className="text-xs text-white/80 truncate">
                Better experience on your phone
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="https://apps.apple.com/app/moveboss"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Download
            </a>
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
