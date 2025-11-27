'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  unreadCount: number;
}

export function NotificationBell({ unreadCount }: NotificationBellProps) {
  return (
    <Link href="/dashboard/notifications">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-full"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 flex items-center justify-center',
              'min-w-[18px] h-[18px] px-1 rounded-full',
              'bg-destructive text-destructive-foreground',
              'text-[10px] font-semibold'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
