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
  // These are the ONLY metrics that matter for immediate operations
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        state="neutral"
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
  // Ultra-premium, calm design with giant numbers
  const stateClasses = {
    active: 'border-emerald-200/50 bg-emerald-50/30 hover:bg-emerald-50/50',
    success: 'border-emerald-200/50 bg-emerald-50/30 hover:bg-emerald-50/50',
    warning: 'border-amber-200/50 bg-amber-50/30 hover:bg-amber-50/50',
    critical: 'border-red-200/50 bg-red-50/30 hover:bg-red-50/50',
    neutral: 'border-border/30 bg-card hover:bg-muted/30',
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
      className={`block p-8 rounded-2xl border transition-all shadow-sm hover:shadow-md ${stateClasses[state]} group`}
    >
      <div className="space-y-3">
        <p className={`text-5xl font-semibold tracking-tight tabular-nums ${numberClasses[state]} group-hover:scale-105 transition-transform origin-left`}>
          {isMonetary ? number : number}
          {suffix && <span className="text-3xl ml-2 font-normal text-muted-foreground">{suffix}</span>}
        </p>
        <p className="text-sm font-medium text-muted-foreground">
          {label}
        </p>
      </div>
    </Link>
  );
}
