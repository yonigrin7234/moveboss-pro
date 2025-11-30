'use client';

import { useState, useEffect, useCallback } from 'react';

interface SetupProgress {
  first_driver_added: boolean;
  first_vehicle_added: boolean;
  first_partner_added: boolean;
  first_load_created: boolean;
  compliance_verified: boolean;
  checklist_dismissed: boolean;
}

type SetupProgressField =
  | 'first_driver_added'
  | 'first_vehicle_added'
  | 'first_partner_added'
  | 'first_load_created'
  | 'compliance_verified';

interface SetupCounts {
  drivers: number;
  vehicles: number;
  partners: number;
  loads: number;
}

interface UseSetupProgressReturn {
  progress: SetupProgress | null;
  counts: SetupCounts | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markComplete: (field: SetupProgressField) => Promise<void>;
  dismissChecklist: () => Promise<void>;
}

export function useSetupProgress(): UseSetupProgressReturn {
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [counts, setCounts] = useState<SetupCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/setup-progress');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch progress');
      }
      const data = await res.json();
      setProgress(data.progress);
      setCounts(data.counts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markComplete = useCallback(async (field: SetupProgressField) => {
    try {
      const res = await fetch('/api/setup-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update progress');
      }
      const data = await res.json();
      setProgress(data.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const dismissChecklist = useCallback(async () => {
    try {
      const res = await fetch('/api/setup-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'checklist_dismissed', value: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to dismiss checklist');
      }
      const data = await res.json();
      setProgress(data.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Refetch when window gains focus (handles multi-tab updates)
  useEffect(() => {
    const handleFocus = () => {
      fetchProgress();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchProgress]);

  return {
    progress,
    counts,
    isLoading,
    error,
    refetch: fetchProgress,
    markComplete,
    dismissChecklist,
  };
}
