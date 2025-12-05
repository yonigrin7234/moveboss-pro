'use client';

import Link from 'next/link';
import { MapPin, Calendar, Package, ArrowRight, UserPlus } from 'lucide-react';
import type { UnassignedJob } from '@/data/dashboard-data';

interface JobsNeedingAssignmentProps {
  jobs: UnassignedJob[];
}

export function JobsNeedingAssignment({ jobs }: JobsNeedingAssignmentProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Jobs Needing Assignment</h2>
        <div className="py-8 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">All jobs are assigned</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Jobs Needing Assignment</h2>
        <Link
          href="/dashboard/assigned-loads?filter=unassigned"
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="px-6 py-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Date and company */}
                <div className="flex items-center gap-3 mb-2">
                  {job.pickupDate && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(job.pickupDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  {job.companyName && (
                    <span className="text-xs font-medium text-foreground bg-muted px-2 py-0.5 rounded">
                      {job.companyName}
                    </span>
                  )}
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 text-sm mb-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">{job.origin}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium text-foreground truncate">{job.destination}</span>
                </div>

                {/* Details */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {job.cubicFeet && (
                    <span>{job.cubicFeet.toLocaleString()} CF</span>
                  )}
                  {job.rate && (
                    <span>${job.rate.toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* Payout and action */}
              <div className="flex flex-col items-end gap-2">
                {job.payout && (
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ${job.payout.toLocaleString()}
                  </span>
                )}
                <Link
                  href={`/dashboard/assigned-loads/${job.id}?action=assign`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="h-3 w-3" />
                  Assign Driver
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
