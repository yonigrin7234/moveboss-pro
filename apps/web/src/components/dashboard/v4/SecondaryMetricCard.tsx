'use client';

import { cn } from '@/lib/utils';

interface SecondaryMetricCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon?: React.ReactNode;
  href?: string;
}

export function SecondaryMetricCard({
  title,
  value,
  suffix,
  icon,
  href,
}: SecondaryMetricCardProps) {
  const content = (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        'bg-card text-card-foreground border-border',
        href && 'hover:bg-accent/50 hover:border-accent-foreground/20 cursor-pointer'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
            {value}
            {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-md bg-muted text-muted-foreground">
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
