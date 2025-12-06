'use client';

import Link from 'next/link';
import { Search, UserPlus, Plus, DollarSign, FileText, Truck, Package, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type CompanyCapabilities,
  canPostToMarketplace,
  canHaulLoads,
  hasDriverManagement,
} from '@/lib/dashboardMode';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  primary?: boolean;
  highlight?: boolean;
  /** Show only for brokers/moving companies (can post to marketplace) */
  brokerOnly?: boolean;
  /** Show only for carriers/moving companies (can haul) */
  carrierOnly?: boolean;
  /** Show badge with count */
  badgeCount?: number;
}

interface QuickActionsProps {
  /** Number of loads needing driver assignment */
  needsDriverAssignment?: number;
  /** Number of pending marketplace requests */
  pendingRequestsCount?: number;
  /** Company capabilities for role-based visibility */
  company?: CompanyCapabilities | null;
}

export function QuickActions({
  needsDriverAssignment = 0,
  pendingRequestsCount = 0,
  company,
}: QuickActionsProps) {
  const isBroker = canPostToMarketplace(company);
  const isCarrier = canHaulLoads(company);
  const hasDrivers = hasDriverManagement(company);

  const allActions: QuickAction[] = [
    // CARRIER ACTIONS (find work, manage requests)
    {
      label: 'Find Load',
      href: '/dashboard/load-board',
      icon: <Search className="h-4 w-4" />,
      primary: true,
      carrierOnly: true,
    },
    {
      label: 'My Requests',
      href: '/dashboard/my-requests',
      icon: <Clock className="h-4 w-4" />,
      carrierOnly: true,
      badgeCount: pendingRequestsCount,
    },
    // BROKER ACTIONS (post work, find trucks)
    {
      label: 'Post Load',
      href: '/dashboard/post-load',
      icon: <Plus className="h-4 w-4" />,
      primary: !isCarrier, // primary for pure brokers
      brokerOnly: true,
    },
    {
      label: 'Find Truck',
      href: '/dashboard/marketplace-capacity',
      icon: <Package className="h-4 w-4" />,
      brokerOnly: true,
    },
    // DISPATCH ACTIONS (for carriers/moving companies with drivers)
    {
      label: needsDriverAssignment > 0 ? `Assign (${needsDriverAssignment})` : 'Assign Driver',
      href: '/dashboard/assigned-loads?filter=unassigned',
      icon: <UserPlus className="h-4 w-4" />,
      highlight: needsDriverAssignment > 0,
      carrierOnly: true,
    },
    {
      label: 'New Trip',
      href: '/dashboard/trips/new',
      icon: <Truck className="h-4 w-4" />,
      carrierOnly: true,
    },
    // FINANCIAL ACTIONS (available to all)
    {
      label: 'Record Payment',
      href: '/dashboard/finance/receivables',
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      label: 'Settle Driver',
      href: '/dashboard/settlements',
      icon: <FileText className="h-4 w-4" />,
      carrierOnly: true,
    },
  ];

  // Filter actions based on company capabilities
  const visibleActions = allActions.filter((action) => {
    // If brokerOnly, only show if company can post
    if (action.brokerOnly && !isBroker) return false;
    // If carrierOnly, only show if company can haul
    if (action.carrierOnly && !isCarrier) return false;
    return true;
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {visibleActions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all duration-150",
            action.primary
              ? "bg-foreground text-background hover:bg-foreground/90"
              : action.highlight
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
              : "bg-card text-foreground border border-border hover:bg-accent hover:border-foreground/10"
          )}
        >
          {action.icon}
          <span>{action.label}</span>
          {action.badgeCount !== undefined && action.badgeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {action.badgeCount}
            </Badge>
          )}
        </Link>
      ))}
    </div>
  );
}
