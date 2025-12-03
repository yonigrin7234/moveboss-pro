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
  // ALWAYS show exactly 4 cards - no more, no less
  // Square cards with HUGE text-7xl numbers
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
        number={data.availableCF}
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
        isMonetary
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
  isMonetary?: boolean;
}

function MetricCard({ number, label, href, state, suffix, isMonetary }: MetricCardProps) {
  // Square cards with HUGE text-7xl numbers
  const stateClasses = {
    active: 'border-emerald-200/50 bg-white hover:bg-emerald-50/20',
    success: 'border-emerald-200/50 bg-white hover:bg-emerald-50/20',
    warning: 'border-amber-200/50 bg-white hover:bg-amber-50/20',
    critical: 'border-red-200/50 bg-white hover:bg-red-50/20',
    neutral: 'border-border/20 bg-white hover:bg-muted/20',
  };

  const numberClasses = {
    active: 'text-emerald-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    critical: 'text-red-600',
    neutral: 'text-foreground',
  };

  return (
    <Link
      href={href}
      className={`block aspect-square p-6 rounded-2xl border transition-all duration-150 shadow-sm hover:shadow-md ${stateClasses[state]} group`}
    >
      <div className="h-full flex flex-col justify-between">
        <p className={`text-7xl font-semibold tracking-tight tabular-nums ${numberClasses[state]} leading-none`}>
          {isMonetary ? number : number}
          {suffix && <span className="text-3xl ml-1 font-normal text-muted-foreground">{suffix}</span>}
        </p>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
      </div>
    </Link>
  );
}
