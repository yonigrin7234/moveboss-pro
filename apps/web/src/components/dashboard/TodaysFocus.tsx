'use client';

import { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    borderClass: 'border-l-destructive',
    sortOrder: 0,
  },
  warning: {
    icon: AlertTriangle,
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
    iconClass: 'text-warning',
    borderClass: 'border-l-amber-500',
    sortOrder: 1,
  },
  info: {
    icon: Info,
    badgeClass: 'bg-info/10 text-info border-info/20',
    iconClass: 'text-info',
    borderClass: 'border-l-blue-500',
    sortOrder: 2,
  },
  success: {
    icon: CheckCircle2,
    badgeClass: 'bg-success/10 text-success border-success/20',
    iconClass: 'text-success',
    borderClass: 'border-l-success',
    sortOrder: 3,
  },
};

// Constants for item display limits
const MAX_ITEMS_PER_CATEGORY = 6;
const MAX_COLLAPSED_PER_CATEGORY = 2; // For hybrid mode
const MAX_COLLAPSED_TOTAL = 4; // For single mode

// Sort items by severity (urgent first, then warning, info, success)
function sortBySeverity(items: FocusItem[]): FocusItem[] {
  return [...items].sort((a, b) => {
    return severityConfig[a.severity].sortOrder - severityConfig[b.severity].sortOrder;
  });
}

export function TodaysFocus({ mode, items }: TodaysFocusProps) {
  const [expanded, setExpanded] = useState(false);

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
    const fleetItems = sortBySeverity(items.filter(isFleetItem));
    const brokerItems = sortBySeverity(items.filter(isBrokerItem));

    const displayedFleetItems = expanded
      ? fleetItems
      : fleetItems.slice(0, MAX_COLLAPSED_PER_CATEGORY);
    const displayedBrokerItems = expanded
      ? brokerItems
      : brokerItems.slice(0, MAX_COLLAPSED_PER_CATEGORY);
    const hasMoreFleet = fleetItems.length > MAX_COLLAPSED_PER_CATEGORY;
    const hasMoreBroker = brokerItems.length > MAX_COLLAPSED_PER_CATEGORY;

    return (
      <Card className="rounded-2xl shadow-md border-border/30">
        <CardHeader className="py-2.5 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-tight">Today's Focus</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                {items.length}
              </Badge>
              {(hasMoreFleet || hasMoreBroker) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="h-6 text-[10px] px-2"
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="h-3 w-3 ml-1" />
                    </>
                  ) : (
                    <>
                      Show all ({items.length}) <ChevronDown className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-3 pt-0">
          <div className="space-y-3">
            {/* Fleet Section */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Fleet
              </p>
              {fleetItems.length === 0 ? (
                <div className="py-2.5 px-3 text-center rounded-lg bg-accent/10">
                  <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-success opacity-40" />
                  <p className="text-[11px] font-medium text-muted-foreground">All clear</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {displayedFleetItems.map((item) => {
                      const Icon = item.icon;
                      const config = severityConfig[item.severity];

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border-l-2 ${config.borderClass} bg-card border border-border/30 hover:bg-accent/5 transition-all group`}
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
                            className={`${config.badgeClass} font-semibold text-[9px] h-4 px-1.5`}
                          >
                            {item.count}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Marketplace Section */}
            <div className="space-y-1 pt-2 border-t border-border/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Marketplace
              </p>
              {brokerItems.length === 0 ? (
                <div className="py-2.5 px-3 text-center rounded-lg bg-accent/10">
                  <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-success opacity-40" />
                  <p className="text-[11px] font-medium text-muted-foreground">All clear</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {displayedBrokerItems.map((item) => {
                      const Icon = item.icon;
                      const config = severityConfig[item.severity];

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border-l-2 ${config.borderClass} bg-card border border-border/30 hover:bg-accent/5 transition-all group`}
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
                            className={`${config.badgeClass} font-semibold text-[9px] h-4 px-1.5`}
                          >
                            {item.count}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort items by severity for single-mode views
  const sortedItems = sortBySeverity(visibleItems);
  const displayedItems = expanded
    ? sortedItems
    : sortedItems.slice(0, MAX_COLLAPSED_TOTAL);
  const hasMore = sortedItems.length > MAX_COLLAPSED_TOTAL;

  // Carrier and Broker modes - single list with severity sorting
  if (sortedItems.length === 0) {
    return (
      <Card className="rounded-2xl shadow-md border-border/30">
        <CardHeader className="py-2.5 px-5">
          <CardTitle className="text-sm font-semibold tracking-tight">Today's Focus</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-3 pt-0">
          <div className="py-5 text-center">
            <CheckCircle2 className="h-7 w-7 mx-auto mb-1.5 text-success opacity-40" />
            <p className="text-xs font-medium text-foreground">All caught up!</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              No items need attention
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-md border-border/30">
      <CardHeader className="py-2.5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight">Today's Focus</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
              {sortedItems.length}
            </Badge>
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-6 text-[10px] px-2"
              >
                {expanded ? (
                  <>
                    Show less <ChevronUp className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    Show all ({sortedItems.length}) <ChevronDown className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-3 pt-0">
        <div className="space-y-1">
          {displayedItems.map((item) => {
            const Icon = item.icon;
            const config = severityConfig[item.severity];

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border-l-2 ${config.borderClass} bg-card border border-border/30 hover:bg-accent/5 transition-all group`}
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
                  className={`${config.badgeClass} font-semibold text-[9px] h-4 px-1.5`}
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
