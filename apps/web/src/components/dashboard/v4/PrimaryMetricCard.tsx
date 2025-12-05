'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PrimaryMetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  percentChange?: number | null;
  accent: 'emerald' | 'blue' | 'amber' | 'red';
  pulse?: boolean;
  icon?: React.ReactNode;
}

export function PrimaryMetricCard({
  title,
  value,
  subtitle,
  percentChange,
  accent,
  pulse,
  icon,
}: PrimaryMetricCardProps) {
  const accentClasses = {
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      border: 'border-blue-500/20 dark:border-blue-500/30',
      text: 'text-blue-600 dark:text-blue-400',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      text: 'text-amber-600 dark:text-amber-400',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    red: {
      bg: 'bg-red-500/10 dark:bg-red-500/20',
      border: 'border-red-500/20 dark:border-red-500/30',
      text: 'text-red-600 dark:text-red-400',
      icon: 'text-red-600 dark:text-red-400',
    },
  };

  const colors = accentClasses[accent];

  return (
    <div
      className={cn(
        'relative rounded-xl border p-6 transition-all hover:shadow-md',
        'bg-card text-card-foreground',
        colors.border,
        pulse && 'animate-pulse'
      )}
    >
      {/* Accent background glow */}
      <div className={cn('absolute inset-0 rounded-xl opacity-50', colors.bg)} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          {icon && <div className={cn('p-2 rounded-lg', colors.bg, colors.icon)}>{icon}</div>}
        </div>

        {/* Value */}
        <div className="mb-2">
          <span className={cn('text-4xl font-bold tracking-tight', 'text-foreground')}>
            {value}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}

          {percentChange !== null && percentChange !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                percentChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              {percentChange >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(percentChange).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
