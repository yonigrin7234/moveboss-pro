import Link from 'next/link';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { DashboardMode } from '@/lib/dashboardMode';

interface MetricCardProps {
  number: string | number;
  label: string;
  secondary?: string;
  urgency?: {
    level: 'warning' | 'critical';
    text: string;
  };
  href: string;
  linkText?: string;
}

function MetricCard({ number, label, secondary, urgency, href, linkText = 'View all →' }: MetricCardProps) {
  const isUrgent = urgency?.level === 'critical';
  const isWarning = urgency?.level === 'warning';

  return (
    <Link href={href} className="block">
      <Card
        className={`p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-border/50 ${
          isUrgent
            ? 'bg-red-50 border-red-200'
            : isWarning
            ? 'bg-amber-50 border-amber-200'
            : ''
        }`}
      >
        <div className={`text-5xl font-semibold tracking-tight tabular-nums ${
          isUrgent
            ? 'text-red-700'
            : isWarning
            ? 'text-amber-700'
            : 'text-foreground'
        }`}>
          {number}
        </div>
        <p className="text-sm text-muted-foreground mt-2">{label}</p>
        {secondary && (
          <p className="text-sm font-medium text-muted-foreground mt-1">{secondary}</p>
        )}
        {urgency && (
          <div className={`flex items-center justify-center gap-1.5 text-xs font-medium mt-2 ${
            isUrgent ? 'text-red-600' : 'text-amber-600'
          }`}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {urgency.text}
          </div>
        )}
        <div className="flex items-center justify-center gap-1 text-xs font-medium text-primary mt-3">
          {linkText}
          <ArrowRight className="h-3 w-3" />
        </div>
      </Card>
    </Link>
  );
}

interface KeyMetricsProps {
  mode: DashboardMode;
  data: {
    activeTrips?: number;
    needDrivers?: number;
    needDriversCF?: number;
    needDriversValue?: number;
    needDriversUrgent?: number;
    availableCF?: number;
    owedToYou?: string;
    postedLoads?: number;
    pendingRequests?: number;
    activeLoads?: number;
    pendingSettlements?: number;
  };
}

export function KeyMetrics({ mode, data }: KeyMetricsProps) {
  if (mode === 'carrier') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          number={data.activeTrips || 0}
          label="Active Trips"
          href="/dashboard/trips?status=active"
        />
        <MetricCard
          number={data.needDrivers || 0}
          label="Need Drivers"
          secondary={
            data.needDriversCF && data.needDriversValue
              ? `${data.needDriversCF.toLocaleString()} CF · $${(data.needDriversValue / 1000).toFixed(1)}k`
              : undefined
          }
          urgency={
            data.needDriversUrgent && data.needDriversUrgent > 0
              ? {
                  level: 'critical',
                  text: `🔴 ${data.needDriversUrgent} pickup TODAY`,
                }
              : undefined
          }
          href="/dashboard/assigned-loads?filter=unassigned"
          linkText="Assign now →"
        />
        <MetricCard
          number={data.availableCF?.toLocaleString() || '3,200'}
          label="Available CF"
          href="/dashboard/capacity"
        />
        <MetricCard
          number={data.owedToYou || '$24.5k'}
          label="Owed to You"
          href="/dashboard/finance/receivables"
          linkText="View →"
        />
      </div>
    );
  }

  if (mode === 'broker') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          number={data.postedLoads || 0}
          label="Posted Loads"
          href="/dashboard/posted-jobs"
        />
        <MetricCard
          number={data.pendingRequests || 0}
          label="Pending Requests"
          urgency={
            data.pendingRequests && data.pendingRequests > 0
              ? {
                  level: 'warning',
                  text: '⚠️ awaiting response',
                }
              : undefined
          }
          href="/dashboard/carrier-requests"
        />
        <MetricCard
          number={data.activeLoads || 0}
          label="Active Loads"
          href="/dashboard/loads-given-out?status=active"
        />
        <MetricCard
          number={data.owedToYou || '$24.5k'}
          label="Owed to You"
          href="/dashboard/finance/receivables"
          linkText="View →"
        />
      </div>
    );
  }

  // Hybrid mode - 2 rows
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          MY FLEET
        </p>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            number={data.activeTrips || 0}
            label="Active Trips"
            href="/dashboard/trips?status=active"
          />
          <MetricCard
            number={data.needDrivers || 0}
            label="Need Drivers"
            secondary={
              data.needDriversCF && data.needDriversValue
                ? `${data.needDriversCF.toLocaleString()} CF · $${(data.needDriversValue / 1000).toFixed(1)}k`
                : undefined
            }
            urgency={
              data.needDriversUrgent && data.needDriversUrgent > 0
                ? {
                    level: 'critical',
                    text: `🔴 ${data.needDriversUrgent} pickup TODAY`,
                  }
                : undefined
            }
            href="/dashboard/assigned-loads?filter=unassigned"
            linkText="Assign now →"
          />
          <MetricCard
            number={data.pendingSettlements || 0}
            label="Pending Settlements"
            href="/dashboard/finance/settlements?status=pending"
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          MARKETPLACE
        </p>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            number={data.postedLoads || 0}
            label="Posted Loads"
            href="/dashboard/posted-jobs"
          />
          <MetricCard
            number={data.pendingRequests || 0}
            label="Pending Requests"
            urgency={
              data.pendingRequests && data.pendingRequests > 0
                ? {
                    level: 'warning',
                    text: '⚠️ awaiting response',
                  }
                : undefined
            }
            href="/dashboard/carrier-requests"
          />
          <MetricCard
            number={data.owedToYou || '$24.5k'}
            label="Owed to You"
            href="/dashboard/finance/receivables"
            linkText="View →"
          />
        </div>
      </div>
    </div>
  );
}
