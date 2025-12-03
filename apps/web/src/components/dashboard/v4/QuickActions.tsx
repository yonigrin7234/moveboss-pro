import Link from 'next/link';
import { Search, UserPlus, Plus } from 'lucide-react';
import type { DashboardMode } from '@/lib/dashboardMode';

interface QuickActionsProps {
  mode: DashboardMode;
}

export function QuickActions({ mode }: QuickActionsProps) {
  // 3 centered pill buttons - large, floating, rounded-full
  return (
    <div className="flex items-center justify-center gap-4">
      <ActionButton
        href="/dashboard/marketplace"
        icon={<Search className="h-5 w-5" />}
        label="Find Load"
      />
      <ActionButton
        href="/dashboard/assigned-loads?action=assign"
        icon={<UserPlus className="h-5 w-5" />}
        label="Assign Driver"
      />
      {(mode === 'broker' || mode === 'hybrid') && (
        <ActionButton
          href="/dashboard/posted-jobs/new"
          icon={<Plus className="h-5 w-5" />}
          label="Post Load"
        />
      )}
    </div>
  );
}

interface ActionButtonProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function ActionButton({ href, icon, label }: ActionButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-base font-semibold bg-white border-2 border-border/40 hover:border-border/60 text-foreground hover:bg-muted/20 transition-all duration-150 shadow-md hover:shadow-lg"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
