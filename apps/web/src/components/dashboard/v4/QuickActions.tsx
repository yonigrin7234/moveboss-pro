import Link from 'next/link';
import { Search, UserPlus, Plus } from 'lucide-react';
import type { DashboardMode } from '@/lib/dashboardMode';

interface QuickActionsProps {
  mode: DashboardMode;
}

export function QuickActions({ mode }: QuickActionsProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Link
        href="/dashboard/marketplace"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-150"
      >
        <Search className="h-4 w-4" />
        <span>Find Load</span>
      </Link>
      <Link
        href="/dashboard/assigned-loads?action=assign"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-white border border-border/50 text-foreground hover:bg-muted/50 hover:border-border/70 shadow-sm hover:shadow-md transition-all duration-150"
      >
        <UserPlus className="h-4 w-4" />
        <span>Assign Driver</span>
      </Link>
      {(mode === 'broker' || mode === 'hybrid') && (
        <Link
          href="/dashboard/posted-jobs/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-white border border-border/50 text-foreground hover:bg-muted/50 hover:border-border/70 shadow-sm hover:shadow-md transition-all duration-150"
        >
          <Plus className="h-4 w-4" />
          <span>Post Load</span>
        </Link>
      )}
    </div>
  );
}
