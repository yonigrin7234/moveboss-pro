import Link from 'next/link';
import type { DashboardMode } from '@/lib/dashboardMode';

interface KeyMetricsData {
  activeTrips: number;
  needDrivers: number;
  availableCF: number;
  moneyOwed: string;
  postedLoads: number;
  pendingRequests: number;
  activeLoads: number;
}

interface KeyMetricsProps {
  mode: DashboardMode;
  data: KeyMetricsData;
}

export function KeyMetrics({ mode, data }: KeyMetricsProps) {
  if (mode === 'carrier') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          number={data.activeTrips}
          label="Active Trips"
          href="/dashboard/trips?status=active"
          state={data.activeTrips > 0 ? 'success' : 'neutral'}
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
          number={data.moneyOwed}
          label="Money Owed"
          href="/dashboard/finance/receivables"
          state="neutral"
          isMonetary
        />
      </div>
    );
  }

  if (mode === 'broker') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          number={data.postedLoads}
          label="Posted Loads"
          href="/dashboard/posted-jobs"
          state={data.postedLoads > 0 ? 'success' : 'neutral'}
        />
        <MetricCard
          number={data.pendingRequests}
          label="Pending Requests"
          href="/dashboard/carrier-requests"
          state={data.pendingRequests > 10 ? 'warning' : 'neutral'}
        />
        <MetricCard
          number={data.activeLoads}
          label="Active Loads"
          href="/dashboard/loads-given-out?status=active"
          state={data.activeLoads > 0 ? 'success' : 'neutral'}
        />
        <MetricCard
          number={data.moneyOwed}
          label="Money Owed"
          href="/dashboard/finance/receivables"
          state="neutral"
          isMonetary
        />
      </div>
    );
  }

  // Hybrid mode - two rows
  return (
    <div className="space-y-6">
      {/* Row 1: My Fleet */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          MY FLEET
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            number={data.activeTrips}
            label="Active Trips"
            href="/dashboard/trips?status=active"
            state={data.activeTrips > 0 ? 'success' : 'neutral'}
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
            number={data.moneyOwed}
            label="Money Owed"
            href="/dashboard/finance/receivables"
            state="neutral"
            isMonetary
          />
        </div>
      </div>

      {/* Row 2: Marketplace */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          MARKETPLACE
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            number={data.postedLoads}
            label="Posted Loads"
            href="/dashboard/posted-jobs"
            state={data.postedLoads > 0 ? 'success' : 'neutral'}
          />
          <MetricCard
            number={data.pendingRequests}
            label="Pending Requests"
            href="/dashboard/carrier-requests"
            state={data.pendingRequests > 10 ? 'warning' : 'neutral'}
          />
          <MetricCard
            number={data.activeLoads}
            label="Active Loads"
            href="/dashboard/loads-given-out?status=active"
            state={data.activeLoads > 0 ? 'success' : 'neutral'}
          />
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  number: number | string;
  label: string;
  href: string;
  state: 'success' | 'warning' | 'critical' | 'neutral';
  suffix?: string;
  isMonetary?: boolean;
}

function MetricCard({ number, label, href, state, suffix, isMonetary }: MetricCardProps) {
  const stateClasses = {
    success: 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10',
    warning: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10',
    critical: 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10',
    neutral: 'border-border/50 bg-card hover:bg-muted/30',
  };

  const numberClasses = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    critical: 'text-red-600',
    neutral: 'text-foreground',
  };

  return (
    <Link
      href={href}
      className={`block p-6 rounded-xl border transition-all ${stateClasses[state]} group`}
    >
      <div className="space-y-2">
        <p className={`text-5xl font-semibold tracking-tight tabular-nums ${numberClasses[state]} group-hover:scale-105 transition-transform origin-left`}>
          {isMonetary ? number : number}
          {suffix && <span className="text-3xl ml-1">{suffix}</span>}
        </p>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
      </div>
    </Link>
  );
}
