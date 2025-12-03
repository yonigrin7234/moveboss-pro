import Link from 'next/link';
import { Search, UserPlus, Plus } from 'lucide-react';
import type { DashboardMode } from '@/lib/dashboardMode';

interface QuickActionsProps {
  mode: DashboardMode;
}

export function QuickActions({ mode }: QuickActionsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href="/dashboard/marketplace"
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Find Load</span>
      </Link>
      <Link
        href="/dashboard/assigned-loads?action=assign"
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        <UserPlus className="h-3.5 w-3.5" />
        <span>Assign Driver</span>
      </Link>
      {(mode === 'broker' || mode === 'hybrid') && (
        <Link
          href="/dashboard/posted-jobs/new"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Post Load</span>
        </Link>
      )}
    </div>
  );
}
