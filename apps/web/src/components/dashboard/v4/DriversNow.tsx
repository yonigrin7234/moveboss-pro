import Link from 'next/link';
import { Truck } from 'lucide-react';
import type { DashboardMode } from '@/lib/dashboardMode';

export interface DriverStatus {
  id: string;
  name: string;
  status: 'active' | 'available' | 'offline';
  activity?: string;
  location?: string;
  eta?: string;
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

      {/* Horizontal compact strip - Radio board style */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {drivers.slice(0, 12).map((driver) => (
          <Link
            key={driver.id}
            href={`/dashboard/drivers/${driver.id}`}
            className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white border border-border/30 hover:border-border/60 hover:shadow-md transition-all duration-150 group"
          >
            {/* Avatar placeholder with status dot */}
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-xs font-semibold text-foreground">
                {driver.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                  driver.status === 'active'
                    ? 'bg-emerald-500'
                    : driver.status === 'available'
                    ? 'bg-amber-400'
                    : 'bg-slate-400'
                }`}
              />
            </div>
            
            {/* Driver info */}
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-semibold text-foreground whitespace-nowrap truncate">
                {driver.name}
              </p>
              {driver.location && (
                <span className="text-xs text-muted-foreground whitespace-nowrap truncate">
                  {driver.location}
                  {driver.eta && driver.status === 'active' && ` • ETA ${driver.eta}`}
                </span>
              )}
            </div>

            {/* Truck icon for active drivers */}
            {driver.status === 'active' && (
              <Truck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
