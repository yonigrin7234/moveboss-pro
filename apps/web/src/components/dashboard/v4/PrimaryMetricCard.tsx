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
  href?: string;
}

export function PrimaryMetricCard({
  title,
  value,
  subtitle,
  percentChange,
  accent,
  pulse,
  icon,
  href,
}: PrimaryMetricCardProps) {
  const accentClasses = {
    emerald: {
      bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      glow: 'group-hover:shadow-emerald-500/10',
      icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      value: 'text-emerald-600 dark:text-emerald-400',
    },
    blue: {
      bg: 'bg-blue-500/5 dark:bg-blue-500/10',
      border: 'border-blue-500/20 dark:border-blue-500/30',
      glow: 'group-hover:shadow-blue-500/10',
      icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      value: 'text-blue-600 dark:text-blue-400',
    },
    amber: {
      bg: 'bg-amber-500/5 dark:bg-amber-500/10',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      glow: 'group-hover:shadow-amber-500/10',
      icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      value: 'text-amber-600 dark:text-amber-400',
    },
    red: {
      bg: 'bg-red-500/5 dark:bg-red-500/10',
      border: 'border-red-500/20 dark:border-red-500/30',
      glow: 'group-hover:shadow-red-500/10',
      icon: 'bg-red-500/10 text-red-600 dark:text-red-400',
      value: 'text-red-600 dark:text-red-400',
    },
  };

  const colors = accentClasses[accent];

  const content = (
    <>
      {/* Subtle gradient background */}
      <div className={cn(
        'absolute inset-0 rounded-xl opacity-60 transition-opacity duration-300',
        colors.bg,
        'group-hover:opacity-100'
      )} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          {icon && (
            <div className={cn(
              'p-2 rounded-lg transition-transform duration-200 group-hover:scale-105',
              colors.icon
            )}>
              {icon}
            </div>
          )}
        </div>

        {/* Value - larger and bolder */}
        <div className="mb-1">
          <span className={cn(
            'text-3xl sm:text-4xl font-bold tracking-tight tabular-nums',
            'text-foreground'
          )}>
            {value}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 min-h-[20px]">
          {subtitle && (
            <span className="text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}

          {percentChange !== null && percentChange !== undefined && (
            <div
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold',
                percentChange >= 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              )}
            >
              {percentChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(percentChange).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const className = cn(
    'group relative rounded-xl border p-5 transition-all duration-200',
    'bg-card text-card-foreground',
    colors.border,
    'hover:shadow-lg',
    colors.glow,
    pulse && 'ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background animate-pulse',
    href && 'cursor-pointer'
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}
