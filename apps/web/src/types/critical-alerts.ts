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
  balanceDisputes: {
    count: number;
    items: Array<{
      id: string;
      loadId: string;
      loadNumber: string;
      driverName: string;
      originalBalance: number;
      driverNote: string | null;
      createdAt: string;
    }>;
  };
  hasAnyAlerts: boolean;
}
