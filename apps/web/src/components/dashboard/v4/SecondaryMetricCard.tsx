'use client';

import { cn } from '@/lib/utils';

interface SecondaryMetricCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon?: React.ReactNode;
  href?: string;
  highlight?: boolean;
}

export function SecondaryMetricCard({
  title,
  value,
  suffix,
  icon,
  href,
  highlight,
}: SecondaryMetricCardProps) {
  const content = (
    <div
      className={cn(
        'group rounded-lg border p-3.5 transition-all duration-150',
        'bg-card text-card-foreground',
        highlight
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-border',
        href && 'hover:bg-accent/50 hover:border-foreground/10 cursor-pointer hover:shadow-sm'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate uppercase tracking-wide">
            {title}
          </p>
          <p className={cn(
            'mt-0.5 text-xl font-bold tabular-nums',
            highlight ? 'text-red-600 dark:text-red-400' : 'text-foreground'
          )}>
            {value}
            {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
        {icon && (
          <div className={cn(
            'flex-shrink-0 p-2 rounded-md transition-transform duration-150',
            highlight
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-muted text-muted-foreground',
            href && 'group-hover:scale-105'
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}
