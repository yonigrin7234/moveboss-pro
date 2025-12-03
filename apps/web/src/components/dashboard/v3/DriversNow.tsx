import Link from 'next/link';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
  // Broker mode shows active carriers instead
  const title = mode === 'broker' ? 'ACTIVE CARRIERS' : 'DRIVERS NOW';
  const emptyText = mode === 'broker' ? 'No active carriers' : 'No drivers added yet';
  const emptyAction = mode === 'broker' ? 'View carriers →' : 'Add your first driver →';
  const emptyHref = mode === 'broker' ? '/dashboard/companies' : '/dashboard/drivers/new';

  if (drivers.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
        </div>

        <Card className="bg-muted/30 border border-dashed border-border rounded-xl p-8">
          <div className="flex flex-col items-center text-center">
            <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-2">{emptyText}</p>
            <Link
              href={emptyHref}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {emptyAction}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <Link
          href="/dashboard/drivers"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {drivers.slice(0, 4).map((driver) => (
          <Link
            key={driver.id}
            href={`/dashboard/drivers/${driver.id}`}
            className="block"
          >
            <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-border/50">
              <div className="flex items-start gap-2.5 mb-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1 ${
                    driver.status === 'active'
                      ? 'bg-emerald-500'
                      : driver.status === 'available'
                      ? 'bg-amber-400'
                      : 'bg-slate-300'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {driver.name}
                  </p>
                </div>
              </div>

              {driver.activity && (
                <p className="text-xs text-muted-foreground mb-0.5 truncate">
                  {driver.activity}
                </p>
              )}

              {driver.location && (
                <p className="text-xs text-muted-foreground/70 truncate">
                  {driver.location}
                </p>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
