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
  // Helper to determine if an item is fleet-related
  const isFleetItem = (item: FocusItem) => {
    return (
      item.href.includes('/assigned-loads') ||
      item.href.includes('/trips') ||
      item.href.includes('/compliance') ||
      item.href.includes('/drivers') ||
      item.href.includes('/settlements') ||
      item.id === 'outstanding-balance' // Carrier receivables
    );
  };

  // Helper to determine if an item is broker-related
  const isBrokerItem = (item: FocusItem) => {
    return (
      item.href.includes('/posted-jobs') ||
      item.href.includes('/carrier-requests') ||
      item.href.includes('/loads-given-out') ||
      item.id === 'unpaid-invoices' // Broker receivables
    );
  };

  // Filter items based on mode
  const visibleItems = items.filter(item => {
    if (mode === 'broker') {
      // Brokers only see broker items
      return isBrokerItem(item);
    }
    if (mode === 'carrier') {
      // Carriers only see fleet items
      return isFleetItem(item);
    }
    // Hybrid sees everything
    return true;
  });

  // For hybrid mode, split items into subsections
  if (mode === 'hybrid') {
    const fleetItems = items.filter(isFleetItem);
    const brokerItems = items.filter(isBrokerItem);

    return (
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="py-2.5 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-tight">Today's Focus</CardTitle>
            <Badge variant="secondary" className="text-[10px] h-5">
              {items.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <div className="space-y-3">
            {/* My Jobs Subsection */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                My Jobs
              </p>
              {fleetItems.length === 0 ? (
                <div className="py-3 px-3 text-center rounded-lg bg-accent/30">
                  <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-success opacity-40" />
                  <p className="text-[11px] font-medium text-muted-foreground">All clear</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {fleetItems.map((item) => {
                    const Icon = item.icon;
                    const config = severityConfig[item.severity];

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors group"
                      >
                        <div className={`${config.iconClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {item.label}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${config.badgeClass} font-semibold text-[10px] h-5`}
                        >
                          {item.count}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Posted Jobs Subsection */}
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Posted Jobs
              </p>
              {brokerItems.length === 0 ? (
                <div className="py-3 px-3 text-center rounded-lg bg-accent/30">
                  <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-success opacity-40" />
                  <p className="text-[11px] font-medium text-muted-foreground">All clear</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {brokerItems.map((item) => {
                    const Icon = item.icon;
                    const config = severityConfig[item.severity];

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors group"
                      >
                        <div className={`${config.iconClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {item.label}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${config.badgeClass} font-semibold text-[10px] h-5`}
                        >
                          {item.count}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Carrier and Broker modes - single list
  if (visibleItems.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="py-2.5 px-4">
          <CardTitle className="text-sm font-semibold tracking-tight">Today's Focus</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <div className="py-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success opacity-40" />
            <p className="text-xs font-medium text-foreground">All caught up!</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              No items need attention
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="py-2.5 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight">Today's Focus</CardTitle>
          <Badge variant="secondary" className="text-[10px] h-5">
            {visibleItems.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const config = severityConfig[item.severity];

            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors group"
              >
                <div className={`${config.iconClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {item.label}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`${config.badgeClass} font-semibold text-[10px] h-5`}
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
