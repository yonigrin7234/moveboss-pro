export type IconName = 'Package' | 'Truck' | 'DollarSign' | 'FileText' | 'AlertTriangle';

export interface FocusItem {
  id: string;
  icon: IconName;
  label: string;
  count: number | string;
  href: string;
  severity: 'urgent' | 'warning' | 'info' | 'success';
  description?: string;
}

/**
 * Helper function to generate focus items for carriers
 */
export function getCarrierFocusItems(stats: {
  unassignedLoads?: number;
  activeTrips?: number;
  pendingSettlements?: number;
  expiringDocs?: number;
  outstandingBalance?: number;
}): FocusItem[] {
  const items: FocusItem[] = [];

  if (stats.unassignedLoads && stats.unassignedLoads > 0) {
    items.push({
      id: 'unassigned-loads',
      icon: 'Package' as IconName,
      label: 'Loads Awaiting Assignment',
      count: stats.unassignedLoads,
      href: '/dashboard/assigned-loads?filter=unassigned',
      severity: 'warning',
      description: 'Loads without drivers assigned',
    });
  }

  if (stats.activeTrips && stats.activeTrips > 0) {
    items.push({
      id: 'active-trips',
      icon: 'Truck' as IconName,
      label: 'Drivers En Route',
      count: stats.activeTrips,
      href: '/dashboard/trips?status=active',
      severity: 'info',
      description: 'Trips currently in progress',
    });
  }

  if (stats.pendingSettlements && stats.pendingSettlements > 0) {
    items.push({
      id: 'pending-settlements',
      icon: 'DollarSign' as IconName,
      label: 'Pending Settlements',
      count: stats.pendingSettlements,
      href: '/dashboard/finance/settlements?status=pending',
      severity: 'warning',
      description: 'Trips waiting for settlement',
    });
  }

  if (stats.expiringDocs && stats.expiringDocs > 0) {
    items.push({
      id: 'expiring-docs',
      icon: 'FileText' as IconName,
      label: 'Expiring Documents',
      count: stats.expiringDocs,
      href: '/dashboard/compliance',
      severity: stats.expiringDocs > 5 ? 'urgent' : 'warning',
      description: 'Documents expiring within 30 days',
    });
  }

  if (stats.outstandingBalance && stats.outstandingBalance > 0) {
    items.push({
      id: 'outstanding-balance',
      icon: 'DollarSign' as IconName,
      label: 'Outstanding Balances',
      count: `$${(stats.outstandingBalance / 1000).toFixed(1)}k`,
      href: '/dashboard/finance/receivables',
      severity: 'warning',
      description: 'Money owed to you',
    });
  }

  return items;
}

/**
 * Helper function to generate focus items for brokers
 */
export function getBrokerFocusItems(stats: {
  loadsNeedingCarriers?: number;
  pendingRequests?: number;
  activeDeliveries?: number;
  unpaidInvoices?: number;
  expiringQuotes?: number;
}): FocusItem[] {
  const items: FocusItem[] = [];

  if (stats.loadsNeedingCarriers && stats.loadsNeedingCarriers > 0) {
    items.push({
      id: 'loads-needing-carriers',
      icon: 'Package' as IconName,
      label: 'Loads Needing Carriers',
      count: stats.loadsNeedingCarriers,
      href: '/dashboard/posted-jobs?status=open',
      severity: 'urgent',
      description: 'Posted loads without matches',
    });
  }

  if (stats.pendingRequests && stats.pendingRequests > 0) {
    items.push({
      id: 'pending-requests',
      icon: 'Truck' as IconName,
      label: 'Pending Carrier Requests',
      count: stats.pendingRequests,
      href: '/dashboard/carrier-requests',
      severity: 'warning',
      description: 'Requests awaiting your response',
    });
  }

  if (stats.activeDeliveries && stats.activeDeliveries > 0) {
    items.push({
      id: 'active-deliveries',
      icon: 'Truck' as IconName,
      label: 'Active Deliveries',
      count: stats.activeDeliveries,
      href: '/dashboard/loads-given-out?status=active',
      severity: 'info',
      description: 'Loads currently being moved',
    });
  }

  if (stats.unpaidInvoices && stats.unpaidInvoices > 0) {
    items.push({
      id: 'unpaid-invoices',
      icon: 'DollarSign' as IconName,
      label: 'Unpaid Invoices',
      count: `$${(stats.unpaidInvoices / 1000).toFixed(1)}k`,
      href: '/dashboard/finance/receivables',
      severity: 'warning',
      description: 'Outstanding payments',
    });
  }

  if (stats.expiringQuotes && stats.expiringQuotes > 0) {
    items.push({
      id: 'expiring-quotes',
      icon: 'AlertTriangle' as IconName,
      label: 'Expiring Quotes',
      count: stats.expiringQuotes,
      href: '/dashboard/posted-jobs?expiring=true',
      severity: 'warning',
      description: 'Load postings about to expire',
    });
  }

  return items;
}
