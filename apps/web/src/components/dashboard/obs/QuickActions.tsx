import Link from 'next/link';
import { Search, UserPlus, FileText, Plus, Eye, DollarSign } from 'lucide-react';
import type { DashboardMode } from '@/lib/dashboardMode';

interface QuickActionsProps {
  mode: DashboardMode;
}

export function QuickActions({ mode }: QuickActionsProps) {
  if (mode === 'carrier') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionButton
          href="/dashboard/marketplace"
          icon={<Search className="h-5 w-5" />}
          label="Find Load"
          primary
        />
        <ActionButton
          href="/dashboard/assigned-loads?action=assign"
          icon={<UserPlus className="h-5 w-5" />}
          label="Assign Driver"
        />
        <ActionButton
          href="/dashboard/trips/new"
          icon={<FileText className="h-5 w-5" />}
          label="Create Trip"
        />
      </div>
    );
  }

  if (mode === 'broker') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionButton
          href="/dashboard/posted-jobs/new"
          icon={<Plus className="h-5 w-5" />}
          label="Post Load"
          primary
        />
        <ActionButton
          href="/dashboard/carrier-requests"
          icon={<Eye className="h-5 w-5" />}
          label="View Requests"
        />
        <ActionButton
          href="/dashboard/finance/receivables"
          icon={<DollarSign className="h-5 w-5" />}
          label="Receivables"
        />
      </div>
    );
  }

  // Hybrid mode
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ActionButton
        href="/dashboard/marketplace"
        icon={<Search className="h-5 w-5" />}
        label="Find Load"
        primary
      />
      <ActionButton
        href="/dashboard/assigned-loads?action=assign"
        icon={<UserPlus className="h-5 w-5" />}
        label="Assign Driver"
      />
      <ActionButton
        href="/dashboard/posted-jobs/new"
        icon={<Plus className="h-5 w-5" />}
        label="Post Load"
      />
    </div>
  );
}

interface ActionButtonProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}

function ActionButton({ href, icon, label, primary }: ActionButtonProps) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all ${
        primary
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md'
          : 'bg-card border border-border/50 text-foreground hover:bg-muted/30 hover:border-border'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
