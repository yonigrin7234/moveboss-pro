'use client';

import Link from 'next/link';
import { Search, UserPlus, Plus, Clock, Package, Route } from 'lucide-react';
import {
  type CompanyCapabilities,
  canPostToMarketplace,
  canHaulLoads,
} from '@/lib/dashboardMode';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Badge count for items needing attention */
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

  // All actions in unified style
  const actions: QuickAction[] = [
    {
      label: 'Loads',
      href: '/dashboard/loads',
      icon: <Package className="h-4 w-4" />,
    },
    {
      label: 'Trips',
      href: '/dashboard/trips',
      icon: <Route className="h-4 w-4" />,
    },
  ];

  // Add Load Board for carriers
  if (isCarrier) {
    actions.push({
      label: 'Load Board',
      href: '/dashboard/load-board',
      icon: <Search className="h-4 w-4" />,
    });
  }

  // Primary action based on role
  if (isBroker) {
    actions.push({
      label: 'Post Load',
      href: '/dashboard/post-load',
      icon: <Plus className="h-4 w-4" />,
    });
  }

  // Show Assign if there are items needing assignment
  if (needsDriverAssignment > 0) {
    actions.push({
      label: 'Assign',
      href: '/dashboard/assigned-loads?filter=unassigned',
      icon: <UserPlus className="h-4 w-4" />,
      badgeCount: needsDriverAssignment,
    });
  }

  // Show pending requests if any
  if (isCarrier && pendingRequestsCount > 0) {
    actions.push({
      label: 'Requests',
      href: '/dashboard/my-requests',
      icon: <Clock className="h-4 w-4" />,
      badgeCount: pendingRequestsCount,
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {action.icon}
          <span>{action.label}</span>
          {action.badgeCount !== undefined && action.badgeCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
              {action.badgeCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
