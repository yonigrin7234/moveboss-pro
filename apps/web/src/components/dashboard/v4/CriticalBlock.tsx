'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CriticalBlockProps {
  message: string;
  href: string;
  actionText?: string;
  /** 'critical' = red (expired compliance), 'warning' = amber (needs attention) */
  severity?: 'critical' | 'warning';
}

export function CriticalBlock({
  message,
  href,
  actionText = 'View Now',
  severity = 'warning',
}: CriticalBlockProps) {
  const isCritical = severity === 'critical';

  // Extract count from message (e.g., "9 expired compliance items" -> 9)
  const countMatch = message.match(/^(\d+)/);
  const count = countMatch ? parseInt(countMatch[1], 10) : null;

  const styles = isCritical
    ? {
        card: 'bg-rose-500/5 border-rose-500/20 dark:bg-rose-500/10',
        badge: 'bg-rose-500 text-white',
        icon: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
        title: 'text-rose-700 dark:text-rose-300',
        subtitle: 'text-rose-600/80 dark:text-rose-400/80',
        button: 'bg-rose-500 hover:bg-rose-600 text-white',
      }
    : {
        card: 'bg-amber-500/5 border-amber-500/20 dark:bg-amber-500/10',
        badge: 'bg-amber-500 text-white',
        icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        title: 'text-amber-700 dark:text-amber-300',
        subtitle: 'text-amber-600/80 dark:text-amber-400/80',
        button: 'bg-amber-500 hover:bg-amber-600 text-white',
      };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
      <div className={cn('rounded-lg border p-4', styles.card)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn('flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0', styles.icon)}>
              {isCritical ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {count !== null && (
                  <span className={cn('inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded text-xs font-bold', styles.badge)}>
                    {count}
                  </span>
                )}
                <span className={cn('text-sm font-semibold', styles.title)}>
                  {isCritical ? 'Action Required' : 'Needs Attention'}
                </span>
              </div>
              <p className={cn('text-sm mt-0.5 truncate', styles.subtitle)}>
                {message}
              </p>
            </div>
          </div>
          <Link
            href={href}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex-shrink-0',
              styles.button
            )}
          >
            {actionText}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
