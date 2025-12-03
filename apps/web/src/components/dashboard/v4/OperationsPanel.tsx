import Link from 'next/link';
import { Building2, Users, Activity } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  dotNumber?: string;
}

interface Driver {
  id: string;
  name: string;
  status: 'active' | 'available' | 'offline';
}

interface ActivityItem {
  id: string;
  description: string;
  time: string;
}

interface OperationsPanelProps {
  companies: Company[];
  drivers: Driver[];
  activities: ActivityItem[];
}

export function OperationsPanel({ companies, drivers, activities }: OperationsPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Companies */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Recent Companies
          </h3>
          <Link
            href="/dashboard/companies"
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            View all →
          </Link>
        </div>
        <div className="space-y-1.5">
          {companies.slice(0, 5).map((company) => (
            <Link
              key={company.id}
              href={`/dashboard/companies/${company.id}`}
              className="block p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <p className="text-sm font-medium truncate">{company.name}</p>
              <p className="text-xs text-muted-foreground">
                {company.dotNumber ? `DOT: ${company.dotNumber}` : 'No DOT'}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Driver Roster */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Driver Roster
          </h3>
          <Link
            href="/dashboard/drivers"
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            View all →
          </Link>
        </div>
        <div className="space-y-1.5">
          {drivers.slice(0, 5).map((driver) => (
            <Link
              key={driver.id}
              href={`/dashboard/drivers/${driver.id}`}
              className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  driver.status === 'active'
                    ? 'bg-emerald-500'
                    : driver.status === 'available'
                    ? 'bg-amber-400'
                    : 'bg-slate-400'
                }`}
              />
              <p className="text-sm font-medium truncate flex-1">{driver.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{driver.status}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </h3>
        <div className="space-y-2">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="p-2.5 rounded-lg border border-border/30 bg-card">
              <p className="text-sm text-foreground mb-1">{activity.description}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
