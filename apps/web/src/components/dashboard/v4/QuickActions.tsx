import Link from 'next/link';
import { Search, UserPlus, Plus } from 'lucide-react';
import type { DashboardMode } from '@/lib/dashboardMode';

interface QuickActionsProps {
  mode: DashboardMode;
}

export function QuickActions({ mode }: QuickActionsProps) {
  // Compact inline buttons
  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href="/dashboard/marketplace"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Find Load</span>
      </Link>
      <Link
        href="/dashboard/assigned-loads?action=assign"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-border/50 text-foreground hover:bg-muted/50 transition-colors"
      >
        <UserPlus className="h-4 w-4" />
        <span>Assign Driver</span>
      </Link>
      {(mode === 'broker' || mode === 'hybrid') && (
        <Link
          href="/dashboard/posted-jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-border/50 text-foreground hover:bg-muted/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Post Load</span>
        </Link>
      )}
    </div>
  );
}
