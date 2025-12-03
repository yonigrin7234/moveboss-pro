import Link from 'next/link';
import { TrendingUp, TrendingDown, Truck, AlertTriangle, Package, DollarSign } from 'lucide-react';
import type { DashboardMode } from '@/lib/dashboardMode';

interface KeyMetricsData {
  activeTrips: number;
  needDrivers: number;
  availableCF: number;
  outstandingReceivables: string;
}

interface KeyMetricsProps {
  mode: DashboardMode;
  data: KeyMetricsData;
}

export function KeyMetrics({ data }: KeyMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        icon={Truck}
        number={data.activeTrips}
        label="Active Trips"
        href="/dashboard/trips?status=active"
        trend={data.activeTrips > 0 ? 'up' : undefined}
        accent="emerald"
      />
      <MetricCard
        icon={AlertTriangle}
        number={data.needDrivers}
        label="Need Drivers"
        href="/dashboard/assigned-loads?filter=unassigned"
        accent={data.needDrivers > 3 ? 'red' : data.needDrivers > 0 ? 'amber' : 'gray'}
        urgent={data.needDrivers > 3}
      />
      <MetricCard
        icon={Package}
        number={data.availableCF.toLocaleString()}
        label="Available CF"
        href="/dashboard/drivers?status=available"
        accent="gray"
        suffix="cf"
      />
      <MetricCard
        icon={DollarSign}
        number={data.outstandingReceivables}
        label="Receivables"
        href="/dashboard/finance/receivables"
        accent="gray"
      />
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  number: number | string;
  label: string;
  href: string;
  accent: 'emerald' | 'amber' | 'red' | 'gray';
  trend?: 'up' | 'down';
  urgent?: boolean;
  suffix?: string;
}

function MetricCard({ icon: Icon, number, label, href, accent, trend, urgent, suffix }: MetricCardProps) {
  const accentColors = {
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    red: 'border-l-red-500',
    gray: 'border-l-gray-300',
  };

  const iconColors = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    gray: 'text-gray-400',
  };

  return (
    <Link
      href={href}
      className={`
        group relative bg-white rounded-lg border border-gray-200/80 border-l-[3px] ${accentColors[accent]}
        p-4 hover:shadow-md hover:border-gray-300/80 transition-all duration-200
        ${urgent ? 'ring-1 ring-red-100' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-semibold text-gray-900 tabular-nums tracking-tight">
            {number}
            {suffix && <span className="text-sm font-normal text-gray-400 ml-1 uppercase">{suffix}</span>}
          </p>
          <p className="text-xs font-medium text-gray-500 mt-1 truncate">{label}</p>
        </div>
        <div className={`flex-shrink-0 p-1.5 rounded-md bg-gray-50 ${iconColors[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {trend && (
        <div className={`absolute top-2 right-2 ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        </div>
      )}
    </Link>
  );
}
