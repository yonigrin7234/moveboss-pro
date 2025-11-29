import { type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

interface CreationPageShellProps {
  title: string;
  subtitle: string;
  pill?: string;
  className?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function CreationPageShell({
  title,
  subtitle,
  pill = 'New record',
  className,
  children,
  actions,
}: CreationPageShellProps) {
  return (
    <div className={cn('mx-auto max-w-6xl space-y-6', className)}>
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/10 via-background to-card shadow">
        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{pill}</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">{children}</div>
    </div>
  );
}
