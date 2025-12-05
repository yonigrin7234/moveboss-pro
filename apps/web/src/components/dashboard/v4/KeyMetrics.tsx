'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Truck, AlertTriangle, Users, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardMetrics } from '@/data/dashboard-data';

interface KeyMetricsProps {
  metrics: DashboardMetrics;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

export function KeyMetrics({ metrics }: KeyMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        icon={Truck}
        number={metrics.activeTrips}
        label="Active Trips"
        href="/dashboard/trips?status=active"
        accent={metrics.activeTrips > 0 ? 'emerald' : 'neutral'}
      />
      <MetricCard
        icon={Users}
        number={`${metrics.driversOnRoad}/${metrics.totalDrivers}`}
        label="Drivers on Road"
        href="/dashboard/drivers"
        accent={metrics.driversOnRoad > 0 ? 'blue' : 'neutral'}
      />
      <MetricCard
        icon={FileText}
        number={metrics.pendingSettlements}
        label="Pending Settlements"
        href="/dashboard/settlements"
        accent={metrics.pendingSettlements > 0 ? 'amber' : 'neutral'}
      />
      <MetricCard
        icon={AlertCircle}
        number={metrics.overdueInvoices}
        label="Overdue Invoices"
        href="/dashboard/finance/receivables?filter=overdue"
        accent={metrics.overdueInvoices > 0 ? 'red' : 'emerald'}
        urgent={metrics.overdueInvoices > 3}
      />
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  number: number | string;
  label: string;
  href: string;
  accent: 'emerald' | 'amber' | 'red' | 'blue' | 'neutral';
  trend?: 'up' | 'down';
  urgent?: boolean;
}

function MetricCard({ icon: Icon, number, label, href, accent, trend, urgent }: MetricCardProps) {
  const accentConfig = {
    emerald: {
      border: 'border-l-emerald-500',
      icon: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10',
    },
    amber: {
      border: 'border-l-amber-500',
      icon: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/10',
    },
    red: {
      border: 'border-l-red-500',
      icon: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-500/10',
    },
    blue: {
      border: 'border-l-blue-500',
      icon: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/10',
    },
    neutral: {
      border: 'border-l-border',
      icon: 'text-muted-foreground',
      iconBg: 'bg-muted',
    },
  };

  const config = accentConfig[accent];

  return (
    <Link
      href={href}
      className={cn(
        "group relative rounded-lg border bg-card border-l-[3px] p-4 transition-all duration-200",
        "hover:bg-accent/50 hover:shadow-sm hover:border-foreground/10",
        config.border,
        urgent && "ring-1 ring-red-500/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight">
            {number}
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-1 truncate">{label}</p>
        </div>
        <div className={cn("flex-shrink-0 p-1.5 rounded-md", config.iconBg, config.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {trend && (
        <div className={cn(
          "absolute top-2 right-2",
          trend === 'up' ? 'text-emerald-500' : 'text-red-500'
        )}>
          {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        </div>
      )}
    </Link>
  );
}
