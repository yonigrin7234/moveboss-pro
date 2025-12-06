'use client';

import Link from 'next/link';
import { Plus, UserPlus, Banknote, Map, Search, Truck } from 'lucide-react';
import {
  type CompanyCapabilities,
  canPostToMarketplace,
  canHaulLoads,
} from '@/lib/dashboardMode';

interface DashboardActionBarProps {
  /** Company capabilities for role-based visibility */
  company?: CompanyCapabilities | null;
}

export function DashboardActionBar({ company }: DashboardActionBarProps) {
  const isBroker = canPostToMarketplace(company);
  const isCarrier = canHaulLoads(company);

  const allActions = [
    // Primary action differs by role
    {
      label: 'Find Load',
      href: '/dashboard/load-board',
      icon: Search,
      primary: isCarrier && !isBroker, // primary for pure carriers
      carrierOnly: true,
    },
    {
      label: 'Post Load',
      href: '/dashboard/post-load',
      icon: Plus,
      primary: isBroker, // primary for brokers/moving companies
      brokerOnly: true,
    },
    {
      label: 'New Trip',
      href: '/dashboard/trips/new',
      icon: Truck,
      carrierOnly: true,
    },
    {
      label: 'Add Driver',
      href: '/dashboard/drivers/new',
      icon: UserPlus,
      carrierOnly: true,
    },
    {
      label: 'Record Payment',
      href: '/dashboard/finance/payments/new',
      icon: Banknote,
    },
    {
      label: 'Fleet Map',
      href: '/dashboard/map',
      icon: Map,
      carrierOnly: true,
    },
  ];

  // Filter actions based on company capabilities
  const visibleActions = allActions.filter((action) => {
    if (action.brokerOnly && !isBroker) return false;
    if (action.carrierOnly && !isCarrier) return false;
    return true;
  });

  // Limit to 4 actions for mobile bar
  const displayActions = visibleActions.slice(0, 4);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {displayActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                action.primary
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
