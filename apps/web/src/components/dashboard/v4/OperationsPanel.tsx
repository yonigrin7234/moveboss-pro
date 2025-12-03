import Link from 'next/link';
import { Building2, Users, Activity, ArrowRight } from 'lucide-react';

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
      {/* Companies */}
      <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            Companies
          </h3>
          <Link
            href="/dashboard/companies"
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            All
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {companies.slice(0, 4).map((company) => (
            <Link
              key={company.id}
              href={`/dashboard/companies/${company.id}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 truncate">{company.name}</span>
              {company.dotNumber && (
                <span className="text-xs text-gray-400 ml-2">DOT: {company.dotNumber}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Drivers */}
      <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            Driver Roster
          </h3>
          <Link
            href="/dashboard/drivers"
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            All
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {drivers.slice(0, 4).map((driver) => (
            <Link
              key={driver.id}
              href={`/dashboard/drivers/${driver.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                driver.status === 'active' ? 'bg-emerald-500' :
                driver.status === 'available' ? 'bg-amber-400' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium text-gray-900 truncate flex-1">{driver.name}</span>
              <span className="text-xs text-gray-400 capitalize">{driver.status}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Activity className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {activities.slice(0, 4).map((activity) => (
            <div key={activity.id} className="px-4 py-2.5">
              <p className="text-sm text-gray-700 line-clamp-1">{activity.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
