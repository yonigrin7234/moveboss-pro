'use client';

import Link from 'next/link';
import { Search, UserPlus, Plus, DollarSign, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type CompanyCapabilities,
  canPostToMarketplace,
  canHaulLoads,
} from '@/lib/dashboardMode';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  primary?: boolean;
  highlight?: boolean;
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

  // Build actions list - keep it simple with max 4 buttons
  const allActions: QuickAction[] = [];

  // Primary action based on role
  if (isBroker) {
    allActions.push({
      label: 'Post Load',
      href: '/dashboard/post-load',
      icon: <Plus className="h-4 w-4" />,
      primary: true,
    });
  } else if (isCarrier) {
    allActions.push({
      label: 'Find Load',
      href: '/dashboard/load-board',
      icon: <Search className="h-4 w-4" />,
      primary: true,
    });
  }

  // Show Assign button only if there are items needing assignment
  if (isCarrier && needsDriverAssignment > 0) {
    allActions.push({
      label: `Assign (${needsDriverAssignment})`,
      href: '/dashboard/assigned-loads?filter=unassigned',
      icon: <UserPlus className="h-4 w-4" />,
      highlight: true,
    });
  }

  // Show pending requests if any
  if (isCarrier && pendingRequestsCount > 0) {
    allActions.push({
      label: 'Requests',
      href: '/dashboard/my-requests',
      icon: <Clock className="h-4 w-4" />,
      badgeCount: pendingRequestsCount,
    });
  }

  // Record Payment - always useful
  allActions.push({
    label: 'Record Payment',
    href: '/dashboard/finance/receivables',
    icon: <DollarSign className="h-4 w-4" />,
  });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {allActions.map((action) => (
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
