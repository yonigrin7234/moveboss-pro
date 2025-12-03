'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  DollarSign,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DashboardMode } from '@/lib/dashboardMode';
import type { FocusItem, IconName } from '@/lib/dashboardFocusItems';

interface TodaysFocusProps {
  mode: DashboardMode;
  items: FocusItem[];
}

// Map icon names to actual icon components
const iconMap: Record<IconName, React.ComponentType<{ className?: string }>> = {
  Package,
  Truck,
  DollarSign,
  FileText,
  AlertTriangle,
};

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
                      const Icon = iconMap[item.icon];
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
                      const Icon = iconMap[item.icon];
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
            const Icon = iconMap[item.icon];
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
