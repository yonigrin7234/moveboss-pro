'use client';

import Link from 'next/link';
import { Search, UserPlus, Plus, DollarSign, Clock, Package, Route } from 'lucide-react';
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
  /** Navigation link - always visible, styled subtly */
  nav?: boolean;
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

  // Navigation links - always visible for quick access
  const navLinks: QuickAction[] = [
    {
      label: 'Loads',
      href: '/dashboard/loads',
      icon: <Package className="h-4 w-4" />,
      nav: true,
    },
    {
      label: 'Trips',
      href: '/dashboard/trips',
      icon: <Route className="h-4 w-4" />,
      nav: true,
    },
  ];

  // Add Load Board for carriers
  if (isCarrier) {
    navLinks.push({
      label: 'Load Board',
      href: '/dashboard/load-board',
      icon: <Search className="h-4 w-4" />,
      nav: true,
    });
  }

  // Build action buttons
  const actionButtons: QuickAction[] = [];

  // Primary action based on role
  if (isBroker) {
    actionButtons.push({
      label: 'Post Load',
      href: '/dashboard/post-load',
      icon: <Plus className="h-4 w-4" />,
      primary: true,
    });
  }

  // Show Assign button only if there are items needing assignment
  if (needsDriverAssignment > 0) {
    actionButtons.push({
      label: `Assign (${needsDriverAssignment})`,
      href: '/dashboard/assigned-loads?filter=unassigned',
      icon: <UserPlus className="h-4 w-4" />,
      highlight: true,
    });
  }

  // Show pending requests if any
  if (isCarrier && pendingRequestsCount > 0) {
    actionButtons.push({
      label: 'Requests',
      href: '/dashboard/my-requests',
      icon: <Clock className="h-4 w-4" />,
      badgeCount: pendingRequestsCount,
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* Navigation links - subtle style */}
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {link.icon}
          <span>{link.label}</span>
        </Link>
      ))}

      {/* Divider if we have both nav links and action buttons */}
      {navLinks.length > 0 && actionButtons.length > 0 && (
        <div className="h-6 w-px bg-border mx-1" />
      )}

      {/* Action buttons */}
      {actionButtons.map((action) => (
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
