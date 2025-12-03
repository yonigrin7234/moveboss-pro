import Link from 'next/link';
import type { DashboardMode } from '@/lib/dashboardMode';

export interface DriverStatus {
  id: string;
  name: string;
  status: 'active' | 'available' | 'offline';
  activity?: string;
  location?: string;
}

interface DriversNowProps {
  drivers: DriverStatus[];
  mode: DashboardMode;
}

export function DriversNow({ drivers, mode }: DriversNowProps) {
  const title = mode === 'broker' ? 'ACTIVE CARRIERS' : 'DRIVERS LIVE';

  if (drivers.length === 0) {
    return null; // Hide if no drivers
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <Link
          href="/dashboard/drivers"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {drivers.slice(0, 8).map((driver) => (
          <Link
            key={driver.id}
            href={`/dashboard/drivers/${driver.id}`}
            className="flex-shrink-0 w-48 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 hover:border-border transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  driver.status === 'active'
                    ? 'bg-emerald-500'
                    : driver.status === 'available'
                    ? 'bg-amber-400'
                    : 'bg-slate-400'
                }`}
              />
              <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {driver.name}
              </p>
            </div>

            {driver.activity && (
              <p className="text-xs text-muted-foreground mb-1 truncate">{driver.activity}</p>
            )}

            {driver.location && (
              <p className="text-xs text-muted-foreground/70 truncate">{driver.location}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
