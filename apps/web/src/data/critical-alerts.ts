import { createClient } from '@/lib/supabase-server';
import { getWorkspaceCompanyForUser } from './companies';
import { countByUrgencyLevel } from '@/lib/rfd-urgency';
import type { CriticalAlertsData } from '@/types/critical-alerts';

// Re-export type for backwards compatibility
export type { CriticalAlertsData } from '@/types/critical-alerts';

/**
 * Get critical alerts data for the user's workspace
 * This is designed to be called from a client component via API or server action
 */
export async function getCriticalAlertsForUser(userId: string): Promise<CriticalAlertsData> {
  const supabase = await createClient();
  const company = await getWorkspaceCompanyForUser(userId);

  const emptyResult: CriticalAlertsData = {
    pendingLoadRequests: { count: 0, oldestRequestAge: null, items: [] },
    criticalRFD: { criticalCount: 0, urgentCount: 0, approachingCount: 0, totalNeedingAttention: 0 },
    complianceAlerts: { expiredCount: 0, criticalCount: 0, totalCount: 0 },
    balanceDisputes: { count: 0, items: [] },
    hasAnyAlerts: false,
  };

  if (!company) {
    return emptyResult;
  }

  // Fetch data in parallel
  const [pendingRequestsResult, loadsResult, complianceResult, balanceDisputesResult] = await Promise.all([
    // 1. Get pending load requests for company's posted loads
    getPendingLoadRequests(supabase, company.id),
    // 2. Get loads with RFD dates for urgency calculation
    getLoadsForRFDUrgency(supabase, company.id),
    // 3. Get compliance alerts
    getComplianceAlertCounts(supabase, userId),
    // 4. Get pending balance disputes
    getPendingBalanceDisputes(supabase, userId),
  ]);

  // Calculate RFD urgency counts
  const rfdCounts = countByUrgencyLevel(loadsResult);

  const result: CriticalAlertsData = {
    pendingLoadRequests: pendingRequestsResult,
    criticalRFD: {
      criticalCount: rfdCounts.critical,
      urgentCount: rfdCounts.urgent,
      approachingCount: rfdCounts.approaching,
      totalNeedingAttention: rfdCounts.critical + rfdCounts.urgent,
    },
    complianceAlerts: complianceResult,
    balanceDisputes: balanceDisputesResult,
    hasAnyAlerts: false,
  };

  // Determine if there are any alerts
  result.hasAnyAlerts =
    result.pendingLoadRequests.count > 0 ||
    result.criticalRFD.totalNeedingAttention > 0 ||
    result.complianceAlerts.totalCount > 0 ||
    result.balanceDisputes.count > 0;

  return result;
}

async function getPendingLoadRequests(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
): Promise<CriticalAlertsData['pendingLoadRequests']> {
  // Get loads posted by this company
  const { data: postedLoads } = await supabase
    .from('loads')
    .select('id')
    .eq('company_id', companyId)
    .eq('posting_status', 'posted')
    .is('assigned_carrier_id', null);

  const loadIds = (postedLoads || []).map(l => l.id);

  if (loadIds.length === 0) {
    return { count: 0, oldestRequestAge: null, items: [] };
  }

  // Get pending requests for these loads
  const { data: requests, count } = await supabase
    .from('load_requests')
    .select(`
      id,
      created_at,
      carrier:carrier_id(name),
      load:load_id(load_number)
    `, { count: 'exact' })
    .eq('status', 'pending')
    .in('load_id', loadIds)
    .order('created_at', { ascending: true })
    .limit(5);

  if (!requests || requests.length === 0) {
    return { count: 0, oldestRequestAge: null, items: [] };
  }

  // Calculate oldest request age in minutes
  const oldestRequest = requests[0];
  const oldestAge = Math.floor(
    (Date.now() - new Date(oldestRequest.created_at).getTime()) / (1000 * 60)
  );

  return {
    count: count || requests.length,
    oldestRequestAge: oldestAge,
    items: requests.map(r => ({
      id: r.id,
      loadNumber: (r.load as any)?.load_number || '',
      carrierName: (r.carrier as any)?.name || 'Unknown',
      createdAt: r.created_at,
    })),
  };
}

async function getLoadsForRFDUrgency(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
): Promise<Array<{ rfd_date: string | null; rfd_date_tbd: boolean | null; trip_id: string | null }>> {
  // Get active loads (not delivered, not canceled) with RFD data
  const { data: loads } = await supabase
    .from('loads')
    .select('rfd_date, rfd_date_tbd, trip_id')
    .eq('company_id', companyId)
    .not('status', 'in', '("delivered","canceled")')
    .not('rfd_date', 'is', null);

  return (loads || []).map(l => ({
    rfd_date: l.rfd_date,
    rfd_date_tbd: l.rfd_date_tbd ?? null,
    trip_id: l.trip_id ?? null,
  }));
}

async function getComplianceAlertCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<CriticalAlertsData['complianceAlerts']> {
  // Check if compliance_alerts table exists and get counts
  const { data: alerts, error } = await supabase
    .from('compliance_alerts')
    .select('severity', { count: 'exact' })
    .eq('owner_id', userId)
    .eq('is_resolved', false);

  if (error || !alerts) {
    return { expiredCount: 0, criticalCount: 0, totalCount: 0 };
  }

  let expiredCount = 0;
  let criticalCount = 0;

  for (const alert of alerts) {
    if (alert.severity === 'expired') expiredCount++;
    if (alert.severity === 'critical') criticalCount++;
  }

  return {
    expiredCount,
    criticalCount,
    totalCount: alerts.length,
  };
}

async function getPendingBalanceDisputes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<CriticalAlertsData['balanceDisputes']> {
  // Get pending balance disputes for loads owned by this user
  const { data: disputes, error } = await supabase
    .from('load_balance_disputes')
    .select(`
      id,
      load_id,
      original_balance,
      driver_note,
      created_at,
      loads:load_id (
        load_number
      ),
      drivers:driver_id (
        first_name,
        last_name
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !disputes || disputes.length === 0) {
    return { count: 0, items: [] };
  }

  return {
    count: disputes.length,
    items: disputes.map(d => {
      const load = d.loads as unknown as { load_number: string } | null;
      const driver = d.drivers as unknown as { first_name: string; last_name: string } | null;
      return {
        id: d.id,
        loadId: d.load_id,
        loadNumber: load?.load_number || 'Unknown',
        driverName: driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown Driver',
        originalBalance: d.original_balance,
        driverNote: d.driver_note,
        createdAt: d.created_at,
      };
    }),
  };
}

// Re-export from shared utils for backwards compatibility
export { formatRequestAge } from '@/lib/format-utils';
