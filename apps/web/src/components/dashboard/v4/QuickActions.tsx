import Link from 'next/link';
import { Search, UserPlus, Plus } from 'lucide-react';
import type { DashboardMode } from '@/lib/dashboardMode';

interface QuickActionsProps {
  mode: DashboardMode;
}

export function QuickActions({ mode }: QuickActionsProps) {
  // Slim row, muted, NOT dominant
  // These are secondary actions - should not overpower metrics or unassigned loads
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/20 border border-border/30">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Quick Actions:
      </span>
      <div className="flex items-center gap-2">
        <ActionLink
          href="/dashboard/marketplace"
          icon={<Search className="h-3.5 w-3.5" />}
          label="Find Load"
        />
        <ActionLink
          href="/dashboard/assigned-loads?action=assign"
          icon={<UserPlus className="h-3.5 w-3.5" />}
          label="Assign Driver"
        />
        {(mode === 'broker' || mode === 'hybrid') && (
          <ActionLink
            href="/dashboard/posted-jobs/new"
            icon={<Plus className="h-3.5 w-3.5" />}
            label="Post Load"
          />
        )}
      </div>
    </div>
  );
}

interface ActionLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function ActionLink({ href, icon, label }: ActionLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
