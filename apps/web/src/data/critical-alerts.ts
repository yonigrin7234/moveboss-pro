import { createClient } from '@/lib/supabase-server';
import { getWorkspaceCompanyForUser } from './companies';
import { countByUrgencyLevel, type RFDUrgencyLevel } from '@/lib/rfd-urgency';

export interface CriticalAlertsData {
  pendingLoadRequests: {
    count: number;
    oldestRequestAge: number | null; // in minutes
    items: Array<{
      id: string;
      loadNumber: string;
      carrierName: string;
      createdAt: string;
    }>;
  };
  criticalRFD: {
    criticalCount: number;
    urgentCount: number;
    approachingCount: number;
    totalNeedingAttention: number;
  };
  complianceAlerts: {
    expiredCount: number;
    criticalCount: number;
    totalCount: number;
  };
  hasAnyAlerts: boolean;
}

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
    hasAnyAlerts: false,
  };

  if (!company) {
    return emptyResult;
  }

  // Fetch data in parallel
  const [pendingRequestsResult, loadsResult, complianceResult] = await Promise.all([
    // 1. Get pending load requests for company's posted loads
    getPendingLoadRequests(supabase, company.id),
    // 2. Get loads with RFD dates for urgency calculation
    getLoadsForRFDUrgency(supabase, company.id),
    // 3. Get compliance alerts
    getComplianceAlertCounts(supabase, userId),
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
    hasAnyAlerts: false,
  };

  // Determine if there are any alerts
  result.hasAnyAlerts =
    result.pendingLoadRequests.count > 0 ||
    result.criticalRFD.totalNeedingAttention > 0 ||
    result.complianceAlerts.totalCount > 0;

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

/**
 * Format the oldest request age for display
 */
export function formatRequestAge(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
