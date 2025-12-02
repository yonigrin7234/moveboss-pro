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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Link href={href} className="group block">
      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors">
        <div className="p-1.5 rounded-md bg-primary/5 ring-1 ring-primary/10 group-hover:bg-primary/10 transition-colors">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
          {label}
        </span>
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

  // Hybrid mode: single card with two rows
  if (mode === 'hybrid') {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold tracking-tight">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* My Jobs Row */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              My Jobs
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {fleetActions.map((action) => (
                <QuickActionButton key={action.label} {...action} />
              ))}
            </div>
          </div>

          {/* Posted Jobs Row */}
          <div className="pt-3 border-t border-border/50">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Posted Jobs
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {overflowActions.map((action) => (
                <QuickActionButton key={action.label} {...action} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Carrier mode: single card with fleet actions
  if (mode === 'carrier') {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold tracking-tight">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {fleetActions.map((action) => (
              <QuickActionButton key={action.label} {...action} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Broker mode: single card with overflow actions
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold tracking-tight">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {overflowActions.map((action) => (
            <QuickActionButton key={action.label} {...action} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
