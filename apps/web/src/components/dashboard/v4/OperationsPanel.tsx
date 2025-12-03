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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Recent Companies
          </h3>
          <Link href="/dashboard/companies" className="text-xs text-primary hover:text-primary/80 transition-colors">
            View all →
          </Link>
        </div>
        <div className="bg-white border border-border/20 rounded-lg shadow-sm p-3 space-y-1.5">
          {companies.slice(0, 5).map((company) => (
            <Link key={company.id} href={`/dashboard/companies/${company.id}`} className="block px-2.5 py-2 rounded-lg hover:bg-muted/30 hover:shadow-md transition-all duration-150">
              <p className="text-sm font-medium truncate text-foreground">{company.name}</p>
              <p className="text-xs text-muted-foreground">
                {company.dotNumber ? `DOT: ${company.dotNumber}` : 'No DOT'}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Driver Roster
          </h3>
          <Link href="/dashboard/drivers" className="text-xs text-primary hover:text-primary/80 transition-colors">
            View all →
          </Link>
        </div>
        <div className="bg-white border border-border/20 rounded-lg shadow-sm p-3 space-y-1.5">
          {drivers.slice(0, 5).map((driver) => (
            <Link key={driver.id} href={`/dashboard/drivers/${driver.id}`} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/30 hover:shadow-md transition-all duration-150">
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${driver.status === 'active' ? 'bg-emerald-500' : driver.status === 'available' ? 'bg-amber-400' : 'bg-slate-400'}`} />
              <p className="text-sm font-medium truncate flex-1 text-foreground">{driver.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{driver.status}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
          <Activity className="h-5 w-5" />
          Recent Activity
        </h3>
        <div className="bg-white border border-border/20 rounded-lg shadow-sm p-3 space-y-1.5">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="px-2.5 py-2 rounded-lg">
              <p className="text-sm text-foreground mb-1">{activity.description}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
