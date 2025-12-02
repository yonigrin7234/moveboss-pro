import { Building2, Truck, Users, Boxes, Package, Clipboard, DollarSign } from 'lucide-react';
import { StatCard } from './StatCard';
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

export function StatRow({ mode, data }: StatRowProps) {
  if (mode === 'carrier') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Companies"
          value={data.companiesCount || 0}
          description="Accounts across your network"
          href="/dashboard/companies"
          icon={Building2}
        />
        <StatCard
          label="Active Trips"
          value={data.activeTrips || 0} // TODO: Replace with real data
          description="Trips in progress today"
          href="/dashboard/trips?status=active"
          icon={Truck}
        />
        <StatCard
          label="Available Drivers"
          value={data.availableDrivers || 0}
          description="Ready for dispatch"
          href="/dashboard/drivers?status=available"
          icon={Users}
        />
        <StatCard
          label="Open Capacity"
          value={data.openCapacity || '0'} // TODO: Replace with real data
          description="Cubic ft. available"
          href="/dashboard/load-board"
          icon={Boxes}
        />
      </div>
    );
  }

  if (mode === 'broker') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Carriers"
          value={data.activeCarriers || 0} // TODO: Replace with real data
          description="Carriers handling your loads"
          href="/dashboard/companies"
          icon={Building2}
        />
        <StatCard
          label="Posted Loads"
          value={data.postedLoads || 0} // TODO: Replace with real data
          description="Loads posted to marketplace"
          href="/dashboard/posted-jobs"
          icon={Package}
        />
        <StatCard
          label="Pending Requests"
          value={data.pendingRequests || 0} // TODO: Replace with real data
          description="Carrier requests received"
          href="/dashboard/carrier-requests"
          icon={Clipboard}
        />
        <StatCard
          label="Outstanding Balance"
          value={data.outstandingBalance || '$0'} // TODO: Replace with real data
          description="Receivables from carriers"
          href="/dashboard/finance/receivables"
          icon={DollarSign}
        />
      </div>
    );
  }

  // Hybrid mode
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Companies"
        value={data.companiesCount || 0}
        description="Partner companies"
        href="/dashboard/companies"
        icon={Building2}
      />
      <StatCard
        label="Active Trips"
        value={data.activeTrips || 0} // TODO: Replace with real data
        description="Trips in progress"
        href="/dashboard/trips?status=active"
        icon={Truck}
      />
      <StatCard
        label="Posted Loads"
        value={data.postedLoads || 0} // TODO: Replace with real data
        description="Loads to carriers"
        href="/dashboard/posted-jobs"
        icon={Package}
      />
      <StatCard
        label="Available Drivers"
        value={data.availableDrivers || 0}
        description="Ready for dispatch"
        href="/dashboard/drivers?status=available"
        icon={Users}
      />
    </div>
  );
}
