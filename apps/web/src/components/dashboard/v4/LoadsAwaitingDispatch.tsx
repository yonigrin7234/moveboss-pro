'use client';

import Link from 'next/link';
import { Clock, UserPlus, ArrowRight, AlertCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnassignedJob, UrgencyLevel } from '@/data/dashboard-data';

interface LoadsAwaitingDispatchProps {
  loads: UnassignedJob[];
  totalCount: number;
  totalValue: number;
}

const urgencyConfig: Record<UrgencyLevel, {
  badge: string;
  badgeClass: string;
  rowClass: string;
  icon?: React.ReactNode;
}> = {
  today: {
    badge: 'TODAY',
    badgeClass: 'bg-red-500 text-white animate-pulse',
    rowClass: 'border-l-2 border-l-red-500',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  tomorrow: {
    badge: 'TOMORROW',
    badgeClass: 'bg-amber-500 text-white',
    rowClass: 'border-l-2 border-l-amber-500',
  },
  this_week: {
    badge: '',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    rowClass: 'border-l-2 border-l-blue-500/50',
  },
  later: {
    badge: '',
    badgeClass: 'bg-muted text-muted-foreground',
    rowClass: 'border-l-2 border-l-transparent',
  },
};

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

export function LoadsAwaitingDispatch({ loads, totalCount, totalValue }: LoadsAwaitingDispatchProps) {
  const urgentCount = loads.filter(j => j.urgency === 'today' || j.urgency === 'tomorrow').length;
  const hasUrgent = urgentCount > 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header - Always shows count, never "All Clear" */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            hasUrgent ? "bg-red-500/10" : totalCount > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"
          )}>
            {totalCount > 0 ? (
              <Clock className={cn(
                "h-5 w-5",
                hasUrgent ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
              )} />
            ) : (
              <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Loads Awaiting Dispatch</h2>
              <span className={cn(
                "inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-bold tabular-nums",
                totalCount === 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : hasUrgent
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-foreground/10 text-foreground"
              )}>
                {totalCount}
              </span>
            </div>
            {totalCount > 0 ? (
              <p className={cn(
                "text-xs font-medium",
                hasUrgent ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
              )}>
                {hasUrgent ? `${urgentCount} urgent` : formatCurrency(totalValue) + ' total value'}
              </p>
            ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                All loads dispatched
              </p>
            )}
          </div>
        </div>
        <Link
          href="/dashboard/assigned-loads?filter=unassigned"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Empty state - minimal, doesn't say "All Clear" separately */}
      {loads.length === 0 ? (
        <div className="py-8 px-5 text-center">
          <Package className="h-8 w-8 mx-auto text-emerald-500/50 mb-2" />
          <p className="text-sm font-medium text-foreground">Fleet is fully dispatched</p>
          <p className="text-xs text-muted-foreground mt-1">
            <Link href="/dashboard/marketplace" className="text-primary hover:underline">
              Find more loads
            </Link>
            {' '}to keep drivers moving
          </p>
        </div>
      ) : (
        <>
          {/* Loads list */}
          <div className="divide-y divide-border">
            {loads.slice(0, 5).map((load) => {
              const config = urgencyConfig[load.urgency];
              const isUrgent = load.urgency === 'today' || load.urgency === 'tomorrow';

              return (
                <div
                  key={load.id}
                  className={cn(
                    "group px-5 py-3.5 transition-all duration-150 hover:bg-accent/50",
                    config.rowClass
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Left: Route info */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: urgency badge + pickup window */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                          config.badgeClass
                        )}>
                          {config.icon}
                          {config.badge || load.urgencyLabel}
                        </span>
                        {load.pickupWindow && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {load.pickupWindow}
                          </span>
                        )}
                        {load.companyName && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {load.companyName}
                          </span>
                        )}
                      </div>

                      {/* Route: Clean format */}
                      <div className="flex items-baseline gap-1.5 text-sm mb-1">
                        <span className="font-semibold text-foreground truncate max-w-[140px]">
                          {load.origin}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0">→</span>
                        <span className="font-semibold text-foreground truncate max-w-[140px]">
                          {load.destination}
                        </span>
                      </div>

                      {/* Details row */}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {load.cubicFeet && (
                          <span className="font-medium">{load.cubicFeet.toLocaleString()} CF</span>
                        )}
                        {load.rate && (
                          <span>${load.rate.toLocaleString()} rate</span>
                        )}
                        {load.loadNumber && (
                          <span className="text-muted-foreground/70">#{load.loadNumber}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Payout + action */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {load.payout && (
                        <span className={cn(
                          "text-lg font-bold tabular-nums",
                          isUrgent
                            ? "text-foreground"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          ${load.payout.toLocaleString()}
                        </span>
                      )}
                      <Link
                        href={`/dashboard/assigned-loads/${load.id}?action=assign`}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                          isUrgent
                            ? "bg-foreground text-background hover:bg-foreground/90"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                          "group-hover:scale-[1.02] group-hover:shadow-sm"
                        )}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer - show if there are more */}
          {totalCount > 5 && (
            <div className="px-5 py-2.5 border-t border-border bg-muted/20 text-center">
              <Link
                href="/dashboard/assigned-loads?filter=unassigned"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                +{totalCount - 5} more loads need drivers
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
