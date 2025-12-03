import Link from 'next/link';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
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
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <Link
          href="/dashboard/drivers"
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex gap-2 p-3 overflow-x-auto">
        {drivers.slice(0, 10).map((driver) => (
          <Link
            key={driver.id}
            href={`/dashboard/drivers/${driver.id}`}
            className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-md bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all min-w-[180px]"
          >
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                {driver.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                  driver.status === 'active'
                    ? 'bg-emerald-500'
                    : driver.status === 'available'
                    ? 'bg-amber-400'
                    : 'bg-gray-400'
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{driver.name}</p>
              {driver.location && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 truncate">{driver.location}</span>
                  {driver.eta && driver.status === 'active' && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {driver.eta}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
