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
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
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

      {/* Horizontal compact strip - like a radio board */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {drivers.slice(0, 12).map((driver) => (
          <Link
            key={driver.id}
            href={`/dashboard/drivers/${driver.id}`}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-border/30 hover:border-border/60 hover:shadow-sm transition-all duration-150 group"
          >
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                driver.status === 'active'
                  ? 'bg-emerald-500'
                  : driver.status === 'available'
                  ? 'bg-amber-400'
                  : 'bg-slate-400'
              }`}
            />
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                {driver.name}
              </p>
              {driver.location && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {driver.location}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
