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
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        number={data.activeTrips}
        label="Active Trips"
        href="/dashboard/trips?status=active"
        state={data.activeTrips > 0 ? 'active' : 'neutral'}
      />
      <MetricCard
        number={data.needDrivers}
        label="Loads Needing Drivers"
        href="/dashboard/assigned-loads?filter=unassigned"
        state={data.needDrivers > 5 ? 'critical' : data.needDrivers > 0 ? 'warning' : 'success'}
      />
      <MetricCard
        number={data.availableCF.toLocaleString()}
        label="Available Capacity"
        href="/dashboard/drivers?status=available"
        state={data.availableCF < 1000 ? 'warning' : 'neutral'}
        suffix="CF"
      />
      <MetricCard
        number={data.outstandingReceivables}
        label="Outstanding Receivables"
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
  const stateClasses = {
    active: 'bg-white border-border/30',
    success: 'bg-emerald-50/30 border-emerald-200/50',
    warning: 'bg-amber-50/30 border-amber-200/50',
    critical: 'bg-red-50/30 border-red-200/50',
    neutral: 'bg-white border-border/30',
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
      className={`block aspect-square p-4 rounded-lg border shadow-sm transition-all duration-150 hover:shadow-md ${stateClasses[state]}`}
    >
      <p className={`text-7xl font-bold tabular-nums leading-none ${numberClasses[state]}`}>
        {number}
        {suffix && <span className="text-2xl ml-1 font-medium text-muted-foreground">{suffix}</span>}
      </p>
      <p className="text-xs text-muted-foreground mt-3 uppercase tracking-wider">{label}</p>
    </Link>
  );
}
