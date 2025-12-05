'use client';

import Link from 'next/link';
import { Package, ArrowRight, UserPlus, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnassignedJob, UrgencyLevel } from '@/data/dashboard-data';

interface JobsNeedingAssignmentProps {
  jobs: UnassignedJob[];
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

export function JobsNeedingAssignment({ jobs }: JobsNeedingAssignmentProps) {
  const urgentCount = jobs.filter(j => j.urgency === 'today' || j.urgency === 'tomorrow').length;

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Dispatch Queue</h2>
            <p className="text-xs text-muted-foreground">Jobs awaiting driver assignment</p>
          </div>
        </div>
        <div className="py-8 text-center border border-dashed border-border rounded-lg bg-muted/30">
          <Package className="h-8 w-8 mx-auto text-emerald-500/50 mb-2" />
          <p className="text-sm font-medium text-foreground">All Clear</p>
          <p className="text-xs text-muted-foreground mt-1">Every job has a driver assigned</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            urgentCount > 0 ? "bg-red-500/10" : "bg-muted"
          )}>
            <Clock className={cn(
              "h-5 w-5",
              urgentCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Dispatch Queue</h2>
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-foreground/10 text-xs font-bold text-foreground tabular-nums">
                {jobs.length}
              </span>
            </div>
            {urgentCount > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {urgentCount} urgent - need drivers now
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

      {/* Jobs list */}
      <div className="divide-y divide-border">
        {jobs.map((job) => {
          const config = urgencyConfig[job.urgency];
          const isUrgent = job.urgency === 'today' || job.urgency === 'tomorrow';

          return (
            <div
              key={job.id}
              className={cn(
                "group px-5 py-3.5 transition-all duration-150 hover:bg-accent/50",
                config.rowClass
              )}
            >
              <div className="flex items-start gap-4">
                {/* Left: Route info */}
                <div className="flex-1 min-w-0">
                  {/* Top row: urgency badge + company */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                      config.badgeClass
                    )}>
                      {config.icon}
                      {config.badge || job.urgencyLabel}
                    </span>
                    {job.pickupWindow && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {job.pickupWindow}
                      </span>
                    )}
                    {job.companyName && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {job.companyName}
                      </span>
                    )}
                  </div>

                  {/* Route: Clean format */}
                  <div className="flex items-baseline gap-1.5 text-sm mb-1">
                    <span className="font-semibold text-foreground truncate max-w-[140px]">
                      {job.origin}
                    </span>
                    <span className="text-muted-foreground flex-shrink-0">→</span>
                    <span className="font-semibold text-foreground truncate max-w-[140px]">
                      {job.destination}
                    </span>
                  </div>

                  {/* Details row */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {job.cubicFeet && (
                      <span className="font-medium">{job.cubicFeet.toLocaleString()} CF</span>
                    )}
                    {job.rate && (
                      <span>${job.rate.toLocaleString()} rate</span>
                    )}
                    {job.loadNumber && (
                      <span className="text-muted-foreground/70">#{job.loadNumber}</span>
                    )}
                  </div>
                </div>

                {/* Right: Payout + action */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {job.payout && (
                    <span className={cn(
                      "text-lg font-bold tabular-nums",
                      isUrgent
                        ? "text-foreground"
                        : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      ${job.payout.toLocaleString()}
                    </span>
                  )}
                  <Link
                    href={`/dashboard/assigned-loads/${job.id}?action=assign`}
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

      {/* Footer hint */}
      {jobs.length >= 5 && (
        <div className="px-5 py-2.5 border-t border-border bg-muted/20 text-center">
          <Link
            href="/dashboard/assigned-loads?filter=unassigned"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {jobs.length > 5 ? `+${jobs.length - 5} more jobs need drivers` : 'View full dispatch queue'}
          </Link>
        </div>
      )}
    </div>
  );
}
