import Link from 'next/link';
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

export function KeyMetrics({ mode, data }: KeyMetricsProps) {
  // Compact horizontal row - NOT squares
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        number={data.activeTrips}
        label="Active Trips"
        href="/dashboard/trips?status=active"
        state={data.activeTrips > 0 ? 'active' : 'neutral'}
      />
      <MetricCard
        number={data.needDrivers}
        label="Need Drivers"
        href="/dashboard/assigned-loads?filter=unassigned"
        state={data.needDrivers > 5 ? 'critical' : data.needDrivers > 0 ? 'warning' : 'success'}
      />
      <MetricCard
        number={data.availableCF.toLocaleString()}
        label="Capacity"
        href="/dashboard/drivers?status=available"
        state={data.availableCF < 1000 ? 'warning' : 'neutral'}
        suffix="CF"
      />
      <MetricCard
        number={data.outstandingReceivables}
        label="Receivables"
        href="/dashboard/finance/receivables"
        state="neutral"
      />
    </div>
  );
}

interface MetricCardProps {
  number: number | string;
  label: string;
  href: string;
  state: 'active' | 'success' | 'warning' | 'critical' | 'neutral';
  suffix?: string;
}

function MetricCard({ number, label, href, state, suffix }: MetricCardProps) {
  // Compact cards with readable numbers
  const stateClasses = {
    active: 'border-l-emerald-500 bg-emerald-50/50',
    success: 'border-l-emerald-500 bg-emerald-50/50',
    warning: 'border-l-amber-500 bg-amber-50/50',
    critical: 'border-l-red-500 bg-red-50/50',
    neutral: 'border-l-border bg-white',
  };

  const numberClasses = {
    active: 'text-emerald-700',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    critical: 'text-red-700',
    neutral: 'text-foreground',
  };

  return (
    <Link
      href={href}
      className={`block px-4 py-3 rounded-lg border border-border/30 border-l-4 transition-all duration-150 hover:shadow-sm ${stateClasses[state]}`}
    >
      <p className={`text-2xl font-bold tabular-nums ${numberClasses[state]}`}>
        {number}
        {suffix && <span className="text-sm ml-1 font-medium text-muted-foreground">{suffix}</span>}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </Link>
  );
}
