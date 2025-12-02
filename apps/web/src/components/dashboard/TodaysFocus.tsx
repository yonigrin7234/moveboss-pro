import Link from 'next/link';
import {
  AlertTriangle,
  Info,
  Package,
  Truck,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DashboardMode } from '@/lib/dashboardMode';

export interface FocusItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number | string;
  href: string;
  severity: 'urgent' | 'warning' | 'info' | 'success';
  description?: string;
}

interface TodaysFocusProps {
  mode: DashboardMode;
  items: FocusItem[];
}

const severityConfig = {
  urgent: {
    icon: AlertCircle,
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
    iconClass: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
    iconClass: 'text-warning',
  },
  info: {
    icon: Info,
    badgeClass: 'bg-info/10 text-info border-info/20',
    iconClass: 'text-info',
  },
  success: {
    icon: CheckCircle2,
    badgeClass: 'bg-success/10 text-success border-success/20',
    iconClass: 'text-success',
  },
};

export function TodaysFocus({ mode, items }: TodaysFocusProps) {
  const visibleItems = items.filter(item => {
    // Filter items based on mode
    if (mode === 'broker') {
      // Brokers don't see driver/fleet related items
      if (item.href.includes('/drivers')) return false;
      if (item.href.includes('/trips')) return false;
      if (item.href.includes('/compliance')) return false;
    }
    if (mode === 'carrier') {
      // Carriers don't see broker-specific items
      if (item.href.includes('/posted-jobs')) return false;
      if (item.href.includes('/carrier-requests')) return false;
    }
    // Hybrid sees everything
    return true;
  });

  if (visibleItems.length === 0) {
    return (
      <Card className="rounded-lg">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base tracking-tight">Today's Focus</CardTitle>
          <p className="text-[11.5px] text-muted-foreground">
            Items needing attention
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="py-8 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-success opacity-50" />
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No items need immediate attention
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base tracking-tight">Today's Focus</CardTitle>
            <p className="text-[11.5px] text-muted-foreground">
              Items needing attention
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const config = severityConfig[item.severity];

            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all group"
              >
                <div className={`${config.iconClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`${config.badgeClass} font-semibold text-xs`}
                >
                  {item.count}
                </Badge>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Helper function to generate focus items for carriers
 */
export function getCarrierFocusItems(stats: {
  unassignedLoads?: number;
  activeTrips?: number;
  pendingSettlements?: number;
  expiringDocs?: number;
  outstandingBalance?: number;
}): FocusItem[] {
  const items: FocusItem[] = [];

  if (stats.unassignedLoads && stats.unassignedLoads > 0) {
    items.push({
      id: 'unassigned-loads',
      icon: Package,
      label: 'Loads Awaiting Assignment',
      count: stats.unassignedLoads,
      href: '/dashboard/assigned-loads?filter=unassigned',
      severity: 'warning',
      description: 'Loads without drivers assigned',
    });
  }

  if (stats.activeTrips && stats.activeTrips > 0) {
    items.push({
      id: 'active-trips',
      icon: Truck,
      label: 'Drivers En Route',
      count: stats.activeTrips,
      href: '/dashboard/trips?status=active',
      severity: 'info',
      description: 'Trips currently in progress',
    });
  }

  if (stats.pendingSettlements && stats.pendingSettlements > 0) {
    items.push({
      id: 'pending-settlements',
      icon: DollarSign,
      label: 'Pending Settlements',
      count: stats.pendingSettlements,
      href: '/dashboard/finance/settlements?status=pending',
      severity: 'warning',
      description: 'Trips waiting for settlement',
    });
  }

  if (stats.expiringDocs && stats.expiringDocs > 0) {
    items.push({
      id: 'expiring-docs',
      icon: FileText,
      label: 'Expiring Documents',
      count: stats.expiringDocs,
      href: '/dashboard/compliance',
      severity: stats.expiringDocs > 5 ? 'urgent' : 'warning',
      description: 'Documents expiring within 30 days',
    });
  }

  if (stats.outstandingBalance && stats.outstandingBalance > 0) {
    items.push({
      id: 'outstanding-balance',
      icon: DollarSign,
      label: 'Outstanding Balances',
      count: `$${(stats.outstandingBalance / 1000).toFixed(1)}k`,
      href: '/dashboard/finance/receivables',
      severity: 'warning',
      description: 'Money owed to you',
    });
  }

  return items;
}

/**
 * Helper function to generate focus items for brokers
 */
export function getBrokerFocusItems(stats: {
  loadsNeedingCarriers?: number;
  pendingRequests?: number;
  activeDeliveries?: number;
  unpaidInvoices?: number;
  expiringQuotes?: number;
}): FocusItem[] {
  const items: FocusItem[] = [];

  if (stats.loadsNeedingCarriers && stats.loadsNeedingCarriers > 0) {
    items.push({
      id: 'loads-needing-carriers',
      icon: Package,
      label: 'Loads Needing Carriers',
      count: stats.loadsNeedingCarriers,
      href: '/dashboard/posted-jobs?status=open',
      severity: 'urgent',
      description: 'Posted loads without matches',
    });
  }

  if (stats.pendingRequests && stats.pendingRequests > 0) {
    items.push({
      id: 'pending-requests',
      icon: Truck,
      label: 'Pending Carrier Requests',
      count: stats.pendingRequests,
      href: '/dashboard/carrier-requests',
      severity: 'warning',
      description: 'Requests awaiting your response',
    });
  }

  if (stats.activeDeliveries && stats.activeDeliveries > 0) {
    items.push({
      id: 'active-deliveries',
      icon: Truck,
      label: 'Active Deliveries',
      count: stats.activeDeliveries,
      href: '/dashboard/loads-given-out?status=active',
      severity: 'info',
      description: 'Loads currently being moved',
    });
  }

  if (stats.unpaidInvoices && stats.unpaidInvoices > 0) {
    items.push({
      id: 'unpaid-invoices',
      icon: DollarSign,
      label: 'Unpaid Invoices',
      count: `$${(stats.unpaidInvoices / 1000).toFixed(1)}k`,
      href: '/dashboard/finance/receivables',
      severity: 'warning',
      description: 'Outstanding payments',
    });
  }

  if (stats.expiringQuotes && stats.expiringQuotes > 0) {
    items.push({
      id: 'expiring-quotes',
      icon: AlertTriangle,
      label: 'Expiring Quotes',
      count: stats.expiringQuotes,
      href: '/dashboard/posted-jobs?expiring=true',
      severity: 'warning',
      description: 'Load postings about to expire',
    });
  }

  return items;
}
