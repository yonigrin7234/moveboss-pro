'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSingleEntityUnreadCount } from '@/hooks/useEntityUnreadCounts';

interface LoadMessageBadgeProps {
  loadId: string;
  /** Size variant */
  size?: 'sm' | 'default';
  /** Whether to show even when count is 0 */
  showWhenEmpty?: boolean;
}

/**
 * Client component to show a message icon with unread badge for a load.
 * Can be embedded in server components.
 */
export function LoadMessageBadge({
  loadId,
  size = 'default',
  showWhenEmpty = true,
}: LoadMessageBadgeProps) {
  const { unreadCount } = useSingleEntityUnreadCount('load', loadId);

  if (!showWhenEmpty && unreadCount === 0) {
    return null;
  }

  const sizeClasses = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const badgeSize = size === 'sm' ? 'h-3.5 min-w-3.5 text-[9px]' : 'h-4 min-w-4 text-[10px]';

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className={`${sizeClasses} relative ${
        unreadCount > 0
          ? 'text-primary'
          : 'text-slate-400 hover:text-slate-600'
      }`}
      title={unreadCount > 0 ? `${unreadCount} unread messages` : 'Messages'}
    >
      <Link href={`/dashboard/loads/${loadId}?tab=messages`}>
        <MessageSquare className={iconSize} />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 ${badgeSize} flex items-center justify-center bg-primary text-primary-foreground font-medium rounded-full px-0.5`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}

/**
 * A simpler inline badge (no button) for use in cards/lists
 */
export function LoadMessageIndicator({
  loadId,
  className = '',
}: {
  loadId: string;
  className?: string;
}) {
  const { unreadCount } = useSingleEntityUnreadCount('load', loadId);

  if (unreadCount === 0) return null;

  return (
    <Link
      href={`/dashboard/loads/${loadId}?tab=messages`}
      className={`inline-flex items-center gap-1 text-primary hover:text-primary/80 ${className}`}
      title={`${unreadCount} unread messages`}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{unreadCount}</span>
    </Link>
  );
}
