import { type ReactNode } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

type MetaItem = {
  label: string;
  value: string;
};

type ChecklistItem = {
  label: string;
  detail?: string;
};

interface CreationPageShellProps {
  title: string;
  subtitle: string;
  pill?: string;
  meta?: MetaItem[];
  checklist?: ChecklistItem[];
  className?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function CreationPageShell({
  title,
  subtitle,
  pill = 'New record',
  meta = [],
  checklist = [],
  className,
  children,
  actions,
}: CreationPageShellProps) {
  return (
    <div className={cn('mx-auto max-w-6xl space-y-6', className)}>
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/10 via-background to-card shadow">
        <div className="flex flex-col gap-4 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
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

          <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
            {actions && <div className="flex items-center gap-2">{actions}</div>}
            {meta.length > 0 && (
              <div className="grid w-full max-w-lg grid-cols-2 gap-3">
                {meta.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 text-left shadow-sm"
                  >
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {checklist.length > 0 && (
          <div className="grid gap-2 border-t border-border/60 bg-background/60 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
            {checklist.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-3 shadow-sm"
              >
                <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1.5 text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">{children}</div>
    </div>
  );
}
