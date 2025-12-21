'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Package, Clock, ArrowRight, X, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNotificationSound, useNotificationSoundPreference } from '@/hooks/use-notification-sound';
import { formatRequestAge } from '@/lib/format-utils';

interface LoadRequestItem {
  id: string;
  loadNumber: string;
  carrierName: string;
  createdAt: string;
}

interface LoadRequestInterruptModalProps {
  /** User ID for polling */
  userId?: string;
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  pollInterval?: number;
  /** Whether the modal is enabled */
  enabled?: boolean;
}

const REMIND_LATER_KEY = 'moveboss_request_remind_later';
const REMIND_DURATION = 5 * 60 * 1000; // 5 minutes

export function LoadRequestInterruptModal({
  userId,
  pollInterval = 30000,
  enabled = true,
}: LoadRequestInterruptModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<LoadRequestItem[]>([]);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const lastFetchedRef = useRef<string[]>([]);

  const { getPreference, setPreference } = useNotificationSoundPreference();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playAlert, initAudioContext } = useNotificationSound({ enabled: soundEnabled });

  // Load sound preference on mount
  useEffect(() => {
    setSoundEnabled(getPreference());
  }, [getPreference]);

  // Check if remind later is active
  const isRemindLaterActive = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const remindUntil = sessionStorage.getItem(REMIND_LATER_KEY);
    if (!remindUntil) return false;
    return Date.now() < parseInt(remindUntil, 10);
  }, []);

  // Set remind later
  const setRemindLater = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(REMIND_LATER_KEY, String(Date.now() + REMIND_DURATION));
  }, []);

  // Fetch pending requests
  const fetchRequests = useCallback(async () => {
    if (!userId || !enabled) return;

    try {
      const response = await fetch('/api/critical-alerts');
      if (!response.ok) return;

      const data = await response.json();
      const items = data.pendingLoadRequests?.items || [];

      // Check if there are new requests
      const currentIds = items.map((r: LoadRequestItem) => r.id);
      const newRequests = items.filter(
        (r: LoadRequestItem) => !lastFetchedRef.current.includes(r.id)
      );

      // Update ref
      lastFetchedRef.current = currentIds;

      // If there are new requests and not in remind later mode
      if (newRequests.length > 0 && !isRemindLaterActive() && !isOpen) {
        setRequests(items);
        setIsOpen(true);
        playAlert();
      } else if (items.length > 0) {
        setRequests(items);
      }

      setLastSeenCount(items.length);
    } catch (error) {
      console.error('Failed to fetch load requests:', error);
    }
  }, [userId, enabled, isRemindLaterActive, isOpen, playAlert]);

  // Initial fetch
  useEffect(() => {
    if (enabled && userId) {
      // Initialize audio on first interaction opportunity
      const handleInteraction = () => {
        initAudioContext();
        document.removeEventListener('click', handleInteraction);
      };
      document.addEventListener('click', handleInteraction);

      fetchRequests();

      return () => {
        document.removeEventListener('click', handleInteraction);
      };
    }
  }, [enabled, userId, fetchRequests, initAudioContext]);

  // Polling
  useEffect(() => {
    if (!enabled || !userId || pollInterval <= 0) return;

    const interval = setInterval(fetchRequests, pollInterval);
    return () => clearInterval(interval);
  }, [enabled, userId, pollInterval, fetchRequests]);

  // Handle remind later
  const handleRemindLater = () => {
    setRemindLater();
    setIsOpen(false);
  };

  // Toggle sound preference
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    setPreference(newValue);
  };

  if (!enabled || requests.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10">
                <Package className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {requests.length === 1
                    ? 'New Load Request'
                    : `${requests.length} New Load Requests`}
                </DialogTitle>
                <DialogDescription>
                  {requests.length === 1
                    ? 'A carrier is requesting one of your loads'
                    : 'Carriers are requesting your loads'}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              className="h-8 w-8"
              title={soundEnabled ? 'Mute notification sounds' : 'Enable notification sounds'}
            >
              {soundEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {requests.slice(0, 3).map((request) => {
            const ageMinutes = Math.floor(
              (Date.now() - new Date(request.createdAt).getTime()) / (1000 * 60)
            );

            return (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg border p-3 bg-muted/30"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Load #{request.loadNumber || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    From: {request.carrierName}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatRequestAge(ageMinutes)}
                </div>
              </div>
            );
          })}

          {requests.length > 3 && (
            <p className="text-xs text-center text-muted-foreground">
              +{requests.length - 3} more request{requests.length - 3 !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRemindLater} className="flex-1">
            Remind Me Later
          </Button>
          <Button asChild className="flex-1">
            <Link href="/dashboard/carrier-requests">
              View Requests
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
