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

  return (
    <div className={cn(
      "border-b",
      isCritical
        ? "bg-red-500/10 border-red-500/20"
        : "bg-amber-500/10 border-amber-500/20"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href={href} className="flex items-center justify-between py-2 group">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "flex items-center justify-center h-5 w-5 rounded-full",
              isCritical ? "bg-red-500/20" : "bg-amber-500/20"
            )}>
              {isCritical ? (
                <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
              ) : (
                <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <span className={cn(
              "text-sm",
              isCritical
                ? "font-medium text-red-700 dark:text-red-300"
                : "text-amber-700 dark:text-amber-300"
            )}>
              {message}
            </span>
          </div>
          <span className={cn(
            "flex items-center gap-1 text-xs font-medium transition-colors",
            isCritical
              ? "text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300"
              : "text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300"
          )}>
            {actionText}
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </div>
    </div>
  );
}
