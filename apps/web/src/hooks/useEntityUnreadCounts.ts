'use client';

import { useState, useEffect, useCallback } from 'react';

type EntityType = 'load' | 'trip';

interface UseEntityUnreadCountsOptions {
  /** Refresh interval in milliseconds (default: 60000 = 1 minute) */
  refreshInterval?: number;
  /** Whether to enable automatic refresh (default: true) */
  autoRefresh?: boolean;
}

interface UseEntityUnreadCountsResult {
  /** Map of entity ID to unread count */
  unreadCounts: Record<string, number>;
  /** Whether the hook is currently loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Manually refetch the unread counts */
  refetch: () => Promise<void>;
  /** Get unread count for a specific entity */
  getUnreadCount: (entityId: string) => number;
}

/**
 * Hook to fetch and track unread message counts for loads or trips
 *
 * @param entityType - 'load' or 'trip'
 * @param options - Configuration options
 * @returns Object containing unread counts map and helper functions
 *
 * @example
 * const { unreadCounts, getUnreadCount } = useEntityUnreadCounts('load');
 * const loadUnread = getUnreadCount(load.id);
 */
export function useEntityUnreadCounts(
  entityType: EntityType,
  options: UseEntityUnreadCountsOptions = {}
): UseEntityUnreadCountsResult {
  const { refreshInterval = 60000, autoRefresh = true } = options;

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/messaging/entity-unreads?type=${entityType}`);
      if (!res.ok) {
        throw new Error('Failed to fetch unread counts');
      }
      const data = await res.json();
      setUnreadCounts(data.items || {});
      setError(null);
    } catch (err) {
      console.error('Failed to fetch entity unread counts:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);

  // Initial fetch and polling
  useEffect(() => {
    fetchUnreadCounts();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchUnreadCounts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchUnreadCounts, autoRefresh, refreshInterval]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchUnreadCounts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchUnreadCounts]);

  const getUnreadCount = useCallback(
    (entityId: string): number => {
      return unreadCounts[entityId] || 0;
    },
    [unreadCounts]
  );

  return {
    unreadCounts,
    isLoading,
    error,
    refetch: fetchUnreadCounts,
    getUnreadCount,
  };
}

/**
 * Hook to fetch unread count for a single entity
 * Useful for detail pages where you only need one entity's count
 *
 * @param entityType - 'load' or 'trip'
 * @param entityId - The ID of the entity
 * @returns Object containing unread count and loading state
 */
export function useSingleEntityUnreadCount(
  entityType: EntityType,
  entityId: string | null | undefined
): { unreadCount: number; isLoading: boolean; refetch: () => Promise<void> } {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!entityId) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/messaging/entity-unreads?type=${entityType}&entityId=${entityId}`
      );
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch single entity unread count:', err);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchUnreadCount();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchUnreadCount]);

  return { unreadCount, isLoading, refetch: fetchUnreadCount };
}
