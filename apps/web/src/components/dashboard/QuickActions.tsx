import Link from 'next/link';
import {
  Search,
  Upload,
  Plus,
  Users,
  Package,
  Clipboard,
  DollarSign,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardMode } from '@/lib/dashboardMode';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface QuickActionsProps {
  mode: DashboardMode;
}

function QuickActionButton({ label, href, icon: Icon }: QuickAction) {
  return (
    <Button
      asChild
      variant="secondary"
      className="h-auto flex-col items-start gap-2 p-4 transition-all hover:scale-[1.02] hover:shadow-md"
    >
      <Link href={href}>
        <div className="flex items-center gap-2 w-full">
          <Icon className="h-4 w-4" />
          <span className="font-medium text-sm">{label}</span>
        </div>
      </Link>
    </Button>
  );
}

export function QuickActions({ mode }: QuickActionsProps) {
  const actionsByMode: Record<DashboardMode, QuickAction[]> = {
    carrier: [
      { label: 'Load Board', href: '/dashboard/load-board', icon: Search },
      { label: 'Assigned Loads', href: '/dashboard/assigned-loads', icon: Package },
      { label: 'Trips', href: '/dashboard/trips', icon: Truck },
      { label: 'Drivers', href: '/dashboard/drivers', icon: Users },
    ],
    broker: [
      { label: 'Post Load', href: '/dashboard/post-load', icon: Upload },
      { label: 'My Posted Jobs', href: '/dashboard/posted-jobs', icon: Clipboard },
      { label: 'Carrier Requests', href: '/dashboard/carrier-requests', icon: Truck },
      { label: 'Receivables', href: '/dashboard/finance/receivables', icon: DollarSign },
    ],
    hybrid: [
      { label: 'Load Board', href: '/dashboard/load-board', icon: Search },
      { label: 'Assigned Loads', href: '/dashboard/assigned-loads', icon: Package },
      { label: 'Post Load', href: '/dashboard/post-load', icon: Upload },
      { label: 'My Posted Jobs', href: '/dashboard/posted-jobs', icon: Clipboard },
      { label: 'Trips', href: '/dashboard/trips', icon: Truck },
    ],
  };

  const actions = actionsByMode[mode];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground tracking-tight">Quick Actions</h3>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Jump to common tasks
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((action) => (
          <QuickActionButton key={action.label} {...action} />
        ))}
      </div>
    </div>
  );
}
