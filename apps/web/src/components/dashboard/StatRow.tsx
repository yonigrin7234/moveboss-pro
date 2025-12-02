import Link from 'next/link';
import { Building2, Truck, Users, Boxes, Package, Clipboard, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardMode } from '@/lib/dashboardMode';

interface StatRowProps {
  mode: DashboardMode;
  data: {
    companiesCount?: number;
    activeTrips?: number;
    availableDrivers?: number;
    openCapacity?: string;
    activeCarriers?: number;
    postedLoads?: number;
    pendingRequests?: number;
    outstandingBalance?: string;
  };
}

interface StatItemProps {
  label: string;
  value: string | number;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatItem({ label, value, description, href, icon: Icon }: StatItemProps) {
  return (
    <Link href={href} className="group block">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/5 ring-1 ring-primary/10 group-hover:bg-primary/10 transition-colors">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
            {value}
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-[11px] text-muted-foreground/70 truncate">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export function StatRow({ mode, data }: StatRowProps) {
  if (mode === 'carrier') {
    return (
      <Card className="rounded-xl bg-accent/30">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold tracking-tight">My Jobs Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatItem
              label="Active Trips"
              value={data.activeTrips || 0}
              description="Trips in progress"
              href="/dashboard/trips?status=active"
              icon={Truck}
            />
            <StatItem
              label="Available Drivers"
              value={data.availableDrivers || 0}
              description="Ready for dispatch"
              href="/dashboard/drivers?status=available"
              icon={Users}
            />
            <StatItem
              label="Open Capacity"
              value={data.openCapacity || '0'}
              description="Cubic ft. available"
              href="/dashboard/load-board"
              icon={Boxes}
            />
            <StatItem
              label="Companies"
              value={data.companiesCount || 0}
              description="Partner companies"
              href="/dashboard/companies"
              icon={Building2}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'broker') {
    return (
      <Card className="rounded-xl bg-accent/30">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold tracking-tight">Posted Jobs Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatItem
              label="Posted Loads"
              value={data.postedLoads || 0}
              description="Loads posted to marketplace"
              href="/dashboard/posted-jobs"
              icon={Package}
            />
            <StatItem
              label="Pending Requests"
              value={data.pendingRequests || 0}
              description="Carrier requests"
              href="/dashboard/carrier-requests"
              icon={Clipboard}
            />
            <StatItem
              label="Outstanding Balance"
              value={data.outstandingBalance || '$0'}
              description="Receivables"
              href="/dashboard/finance/receivables"
              icon={DollarSign}
            />
            <StatItem
              label="Active Carriers"
              value={data.activeCarriers || 0}
              description="Carriers working"
              href="/dashboard/companies"
              icon={Building2}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Hybrid mode - show both summary cards
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* My Jobs Summary */}
      <Card className="rounded-xl bg-accent/30">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold tracking-tight">My Jobs Summary</CardTitle>
          <p className="text-[11px] text-muted-foreground">Jobs my trucks are running</p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid gap-4 grid-cols-2">
            <StatItem
              label="Active Trips"
              value={data.activeTrips || 0}
              description="In progress"
              href="/dashboard/trips?status=active"
              icon={Truck}
            />
            <StatItem
              label="Drivers"
              value={data.availableDrivers || 0}
              description="Available"
              href="/dashboard/drivers?status=available"
              icon={Users}
            />
            <StatItem
              label="Capacity"
              value={data.openCapacity || '0'}
              description="Cubic ft."
              href="/dashboard/load-board"
              icon={Boxes}
            />
            <StatItem
              label="Companies"
              value={data.companiesCount || 0}
              description="Partners"
              href="/dashboard/companies"
              icon={Building2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Posted Jobs Summary */}
      <Card className="rounded-xl bg-accent/30">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold tracking-tight">Posted Jobs Summary</CardTitle>
          <p className="text-[11px] text-muted-foreground">Jobs for other carriers</p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid gap-4 grid-cols-2">
            <StatItem
              label="Posted Loads"
              value={data.postedLoads || 0}
              description="On marketplace"
              href="/dashboard/posted-jobs"
              icon={Package}
            />
            <StatItem
              label="Requests"
              value={data.pendingRequests || 0}
              description="Pending"
              href="/dashboard/carrier-requests"
              icon={Clipboard}
            />
            <StatItem
              label="Balance"
              value={data.outstandingBalance || '$0'}
              description="Outstanding"
              href="/dashboard/finance/receivables"
              icon={DollarSign}
            />
            <StatItem
              label="Carriers"
              value={data.activeCarriers || 0}
              description="Active"
              href="/dashboard/companies"
              icon={Building2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
