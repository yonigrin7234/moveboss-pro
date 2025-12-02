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
    <Link href={href} className="block">
      <div className="group h-full rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 ring-1 ring-primary/20 group-hover:bg-primary/15 transition-colors">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
            {label}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function QuickActions({ mode }: QuickActionsProps) {
  // Fleet actions - managing your own trucks and drivers
  const fleetActions: QuickAction[] = [
    { label: 'Load Board', href: '/dashboard/load-board', icon: Search },
    { label: 'Assigned Loads', href: '/dashboard/assigned-loads', icon: Package },
    { label: 'Trips', href: '/dashboard/trips', icon: Truck },
    { label: 'Drivers', href: '/dashboard/drivers', icon: Users },
  ];

  // Overflow actions - jobs you can't handle with your fleet
  const overflowActions: QuickAction[] = [
    { label: 'Post Load', href: '/dashboard/post-load', icon: Upload },
    { label: 'My Posted Jobs', href: '/dashboard/posted-jobs', icon: Clipboard },
    { label: 'Carrier Requests', href: '/dashboard/carrier-requests', icon: Truck },
    { label: 'Receivables', href: '/dashboard/finance/receivables', icon: DollarSign },
  ];

  // Hybrid mode: show both sections organized
  if (mode === 'hybrid') {
    return (
      <div className="space-y-6">
        {/* My Jobs Section */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">My Jobs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jobs my trucks are running
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fleetActions.map((action) => (
              <QuickActionButton key={action.label} {...action} />
            ))}
          </div>
        </div>

        {/* Posted Jobs Section */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Posted Jobs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jobs available for other carriers
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {overflowActions.map((action) => (
              <QuickActionButton key={action.label} {...action} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Carrier mode: show only fleet actions
  if (mode === 'carrier') {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Quick Actions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Jump to common tasks
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {fleetActions.map((action) => (
            <QuickActionButton key={action.label} {...action} />
          ))}
        </div>
      </div>
    );
  }

  // Broker mode: show only overflow actions
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground tracking-tight">Quick Actions</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Jump to common tasks
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {overflowActions.map((action) => (
          <QuickActionButton key={action.label} {...action} />
        ))}
      </div>
    </div>
  );
}
