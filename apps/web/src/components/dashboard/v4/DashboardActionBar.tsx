'use client';

import Link from 'next/link';
import { Plus, UserPlus, Banknote, Map } from 'lucide-react';

export function DashboardActionBar() {
  const actions = [
    {
      label: 'Post Load',
      href: '/dashboard/posted-jobs/new',
      icon: Plus,
      primary: true,
    },
    {
      label: 'Add Driver',
      href: '/dashboard/drivers/new',
      icon: UserPlus,
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
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {actions.map((action) => {
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
