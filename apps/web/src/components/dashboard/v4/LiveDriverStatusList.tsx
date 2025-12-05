'use client';

import Link from 'next/link';
import { Phone, MapPin, ArrowRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiveDriverStatus } from '@/data/dashboard-data';

interface LiveDriverStatusListProps {
  drivers: LiveDriverStatus[];
}

const statusConfig = {
  delivering: {
    label: 'Delivering',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  loading: {
    label: 'Loading',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  in_transit: {
    label: 'In Transit',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  available: {
    label: 'Available',
    className: 'bg-muted text-muted-foreground',
  },
  offline: {
    label: 'Offline',
    className: 'bg-muted text-muted-foreground/60',
  },
};

export function LiveDriverStatusList({ drivers }: LiveDriverStatusListProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Live Driver Status</h2>
        <Link
          href="/dashboard/drivers"
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {drivers.length === 0 ? (
        <div className="py-8 px-6 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No active drivers</p>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
          {drivers.map((driver) => {
            const status = statusConfig[driver.status];

            return (
              <div
                key={driver.id}
                className="px-6 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                  {driver.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {driver.name}
                    </p>
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                        status.className
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  {driver.location && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{driver.location}</span>
                      {driver.eta && (
                        <span className="text-muted-foreground/60">• ETA {driver.eta}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Call button */}
                {driver.phone && (
                  <a
                    href={`tel:${driver.phone}`}
                    className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={`Call ${driver.name}`}
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
