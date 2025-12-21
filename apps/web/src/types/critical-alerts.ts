/**
 * Critical alerts types
 * Shared between client and server components
 */

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
