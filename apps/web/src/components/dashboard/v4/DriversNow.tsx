import Link from 'next/link';
import { MapPin, Clock } from 'lucide-react';
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
  const title = mode === 'broker' ? 'Active Carriers' : 'Drivers Live';

  if (drivers.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-border/40 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <Link
          href="/dashboard/drivers"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {drivers.slice(0, 12).map((driver) => (
          <Link
            key={driver.id}
            href={`/dashboard/drivers/${driver.id}`}
            className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-border/60 hover:bg-muted/50 transition-all duration-150 min-w-[200px]"
          >
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
                {driver.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                  driver.status === 'active'
                    ? 'bg-emerald-500'
                    : driver.status === 'available'
                    ? 'bg-amber-400'
                    : 'bg-slate-400'
                }`}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{driver.name}</p>
              {driver.location && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {driver.location}
                    {driver.eta && driver.status === 'active' && (
                      <>
                        {' • '}
                        <Clock className="h-3 w-3 inline text-muted-foreground" />
                        {driver.eta}
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
