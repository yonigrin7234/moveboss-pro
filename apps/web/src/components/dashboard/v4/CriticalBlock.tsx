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
    <div className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href={href}
          className={cn(
            "flex items-center justify-between py-2.5 group border-l-4 -ml-4 pl-4",
            isCritical ? "border-l-red-500" : "border-l-amber-500"
          )}
        >
          <div className="flex items-center gap-2.5">
            {isCritical ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-sm text-foreground">
              {message}
            </span>
          </div>
          <span className={cn(
            "flex items-center gap-1 text-xs font-medium transition-colors",
            isCritical
              ? "text-red-500 group-hover:text-red-400"
              : "text-amber-500 group-hover:text-amber-400"
          )}>
            {actionText}
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </div>
    </div>
  );
}
