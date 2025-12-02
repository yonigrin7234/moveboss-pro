import Link from 'next/link';
import { Truck, Package } from 'lucide-react';
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

interface PremiumStatItemProps {
  label: string;
  value: string | number;
  description: string;
  href: string;
}

function PremiumStatItem({ label, value, description, href }: PremiumStatItemProps) {
  return (
    <Link href={href} className="group block">
      <div className="space-y-1">
        <p className="text-4xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
          {value}
        </p>
        <p className="text-xs font-semibold text-foreground/90 tracking-tight">
          {label}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {description}
        </p>
      </div>
    </Link>
  );
}

export function StatRow({ mode, data }: StatRowProps) {
  if (mode === 'carrier') {
    return (
      <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/5 to-transparent shadow-md border-border/30">
        {/* Floating Icon */}
        <div className="absolute top-6 right-6 opacity-20 pointer-events-none">
          <Truck className="h-16 w-16 text-primary" />
        </div>

        <CardHeader className="py-4 px-6">
          <CardTitle className="text-sm font-semibold tracking-tight">Fleet Health</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-6">
            <PremiumStatItem
              label="Active Trips"
              value={data.activeTrips || 0}
              description="Trips in progress"
              href="/dashboard/trips?status=active"
            />
            <PremiumStatItem
              label="Available Drivers"
              value={data.availableDrivers || 0}
              description="Ready for dispatch"
              href="/dashboard/drivers?status=available"
            />
            <PremiumStatItem
              label="Open Capacity"
              value={data.openCapacity || '0'}
              description="Cubic ft. available"
              href="/dashboard/load-board"
            />
            <PremiumStatItem
              label="Partner Companies"
              value={data.companiesCount || 0}
              description="Active partnerships"
              href="/dashboard/companies"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'broker') {
    return (
      <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/5 to-transparent shadow-lg border-border/30">
        {/* Floating Icon */}
        <div className="absolute top-6 right-6 opacity-20 pointer-events-none">
          <Package className="h-16 w-16 text-primary" />
        </div>

        <CardHeader className="py-4 px-6">
          <CardTitle className="text-sm font-semibold tracking-tight">Marketplace Health</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-6">
            <PremiumStatItem
              label="Posted Loads"
              value={data.postedLoads || 0}
              description="On marketplace"
              href="/dashboard/posted-jobs"
            />
            <PremiumStatItem
              label="Pending Requests"
              value={data.pendingRequests || 0}
              description="Carrier requests"
              href="/dashboard/carrier-requests"
            />
            <PremiumStatItem
              label="Outstanding Balance"
              value={data.outstandingBalance || '$0'}
              description="Receivables"
              href="/dashboard/finance/receivables"
            />
            <PremiumStatItem
              label="Active Carriers"
              value={data.activeCarriers || 0}
              description="Working carriers"
              href="/dashboard/companies"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Hybrid mode - show both premium cards side by side
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Fleet Health Card */}
      <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/5 to-transparent shadow-md border-border/30">
        {/* Floating Icon */}
        <div className="absolute top-6 right-6 opacity-20 pointer-events-none">
          <Truck className="h-16 w-16 text-primary" />
        </div>

        <CardHeader className="py-4 px-6">
          <CardTitle className="text-sm font-semibold tracking-tight">Fleet Health</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-6">
            <PremiumStatItem
              label="Active Trips"
              value={data.activeTrips || 0}
              description="In progress"
              href="/dashboard/trips?status=active"
            />
            <PremiumStatItem
              label="Drivers"
              value={data.availableDrivers || 0}
              description="Available"
              href="/dashboard/drivers?status=available"
            />
            <PremiumStatItem
              label="Capacity"
              value={data.openCapacity || '0'}
              description="Cubic ft."
              href="/dashboard/load-board"
            />
            <PremiumStatItem
              label="Companies"
              value={data.companiesCount || 0}
              description="Partners"
              href="/dashboard/companies"
            />
          </div>
        </CardContent>
      </Card>

      {/* Marketplace Health Card */}
      <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/5 to-transparent shadow-lg border-border/30">
        {/* Floating Icon */}
        <div className="absolute top-6 right-6 opacity-20 pointer-events-none">
          <Package className="h-16 w-16 text-primary" />
        </div>

        <CardHeader className="py-4 px-6">
          <CardTitle className="text-sm font-semibold tracking-tight">Marketplace Health</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-6">
            <PremiumStatItem
              label="Posted Loads"
              value={data.postedLoads || 0}
              description="On marketplace"
              href="/dashboard/posted-jobs"
            />
            <PremiumStatItem
              label="Requests"
              value={data.pendingRequests || 0}
              description="Pending"
              href="/dashboard/carrier-requests"
            />
            <PremiumStatItem
              label="Balance"
              value={data.outstandingBalance || '$0'}
              description="Outstanding"
              href="/dashboard/finance/receivables"
            />
            <PremiumStatItem
              label="Carriers"
              value={data.activeCarriers || 0}
              description="Active"
              href="/dashboard/companies"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
