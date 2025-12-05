'use client';

import Link from 'next/link';
import { Search, UserPlus, Plus, DollarSign, FileText, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  primary?: boolean;
  highlight?: boolean;
}

interface QuickActionsProps {
  needsDriverAssignment?: number;
}

export function QuickActions({ needsDriverAssignment = 0 }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      label: 'Find Load',
      href: '/dashboard/load-board',
      icon: <Search className="h-4 w-4" />,
      primary: true,
    },
    {
      label: needsDriverAssignment > 0 ? `Assign (${needsDriverAssignment})` : 'Assign Driver',
      href: '/dashboard/assigned-loads?filter=unassigned',
      icon: <UserPlus className="h-4 w-4" />,
      highlight: needsDriverAssignment > 0,
    },
    {
      label: 'Post Load',
      href: '/dashboard/post-load',
      icon: <Plus className="h-4 w-4" />,
    },
    {
      label: 'New Trip',
      href: '/dashboard/trips/new',
      icon: <Truck className="h-4 w-4" />,
    },
    {
      label: 'Record Payment',
      href: '/dashboard/finance/receivables',
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      label: 'Settle Driver',
      href: '/dashboard/settlements',
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {actions.map((action) => (
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
        </Link>
      ))}
    </div>
  );
}
