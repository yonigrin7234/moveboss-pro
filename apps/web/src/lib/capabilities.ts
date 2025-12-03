import type { UserRole } from '@/data/onboarding';

export interface CompanyCapabilities {
  // Fleet Management
  canUseFleetTools: boolean;      // Can manage drivers, trucks, trailers
  canViewDrivers: boolean;         // Can see driver roster
  canCreateTrips: boolean;         // Can create and manage trips
  canViewTrips: boolean;           // Can view trip list
  canViewCapacity: boolean;        // Can see available capacity

  // Load Management
  canTakeLoads: boolean;           // Can accept loads from load board (carrier capability)
  canGiveLoads: boolean;           // Can post loads for carriers to take (broker/dispatcher)
  canPostToMarketplace: boolean;   // Can post loads to marketplace
  canBrowseLoadBoard: boolean;     // Can browse and request loads
  canPostCapacity: boolean;        // Can post available capacity

  // Partnerships
  canManagePartners: boolean;      // Can add/manage company partnerships
  canSeeCarrierRequests: boolean;  // Can see carrier requests for posted loads
  canSeePostedJobs: boolean;       // Can see own posted jobs
  canSeeLoadsGivenOut: boolean;    // Can see loads given to carriers

  // Compliance & Finance
  canSeeCompliance: boolean;       // Can see compliance alerts/docs
  canSeeFinance: boolean;          // Can see finance section
  canSeeReceivables: boolean;      // Can see outstanding receivables
  canSeeSettlements: boolean;      // Can see trip settlements
}

/**
 * Determines company capabilities based on user role
 *
 * Roles:
 * - 'carrier': Has fleet, takes loads from others
 * - 'company': Broker/dispatcher, gives loads to carriers (no fleet)
 * - 'owner_operator': Single truck owner, takes loads
 * - 'driver': Driver only, limited access
 */
export function getCapabilitiesForRole(role: UserRole | null): CompanyCapabilities {
  // Default to carrier capabilities if no role
  if (!role || role === 'carrier') {
    // CARRIER: Has fleet, takes loads from others
    return {
      // Fleet tools - YES
      canUseFleetTools: true,
      canViewDrivers: true,
      canCreateTrips: true,
      canViewTrips: true,
      canViewCapacity: true,

      // Load management - Take loads
      canTakeLoads: true,
      canGiveLoads: false,  // Carriers don't typically give loads
      canPostToMarketplace: false,
      canBrowseLoadBoard: true,
      canPostCapacity: true,

      // Partnerships
      canManagePartners: true,
      canSeeCarrierRequests: false,  // Carriers receive load assignments, not requests
      canSeePostedJobs: false,
      canSeeLoadsGivenOut: false,

      // Compliance & Finance
      canSeeCompliance: true,
      canSeeFinance: true,
      canSeeReceivables: true,  // Money owed TO carrier
      canSeeSettlements: true,
    };
  }

  if (role === 'company') {
    // BROKER/MOVING COMPANY: Gives loads to carriers, no fleet
    return {
      // Fleet tools - NO
      canUseFleetTools: false,
      canViewDrivers: false,
      canCreateTrips: false,
      canViewTrips: false,
      canViewCapacity: false,

      // Load management - Give loads
      canTakeLoads: false,
      canGiveLoads: true,
      canPostToMarketplace: true,
      canBrowseLoadBoard: false,  // Brokers post, don't browse
      canPostCapacity: false,

      // Partnerships
      canManagePartners: true,
      canSeeCarrierRequests: true,  // See requests from carriers
      canSeePostedJobs: true,
      canSeeLoadsGivenOut: true,

      // Compliance & Finance
      canSeeCompliance: false,  // No drivers to manage compliance for
      canSeeFinance: true,
      canSeeReceivables: true,  // Money owed BY carriers
      canSeeSettlements: false,  // No trips to settle
    };
  }

  if (role === 'owner_operator') {
    // OWNER OPERATOR: Single truck, takes loads
    return {
      // Fleet tools - LIMITED (no multi-driver management)
      canUseFleetTools: true,
      canViewDrivers: false,  // Only themselves
      canCreateTrips: true,
      canViewTrips: true,
      canViewCapacity: true,

      // Load management - Take loads
      canTakeLoads: true,
      canGiveLoads: false,
      canPostToMarketplace: false,
      canBrowseLoadBoard: true,
      canPostCapacity: true,

      // Partnerships
      canManagePartners: true,
      canSeeCarrierRequests: false,
      canSeePostedJobs: false,
      canSeeLoadsGivenOut: false,

      // Compliance & Finance
      canSeeCompliance: true,
      canSeeFinance: true,
      canSeeReceivables: true,
      canSeeSettlements: true,
    };
  }

  if (role === 'driver') {
    // DRIVER: Limited access, uses mobile app primarily
    return {
      // Fleet tools - NO
      canUseFleetTools: false,
      canViewDrivers: false,
      canCreateTrips: false,
      canViewTrips: true,  // Can see own trips
      canViewCapacity: false,

      // Load management - NO
      canTakeLoads: false,
      canGiveLoads: false,
      canPostToMarketplace: false,
      canBrowseLoadBoard: false,
      canPostCapacity: false,

      // Partnerships
      canManagePartners: false,
      canSeeCarrierRequests: false,
      canSeePostedJobs: false,
      canSeeLoadsGivenOut: false,

      // Compliance & Finance
      canSeeCompliance: false,
      canSeeFinance: true,  // See own earnings
      canSeeReceivables: false,
      canSeeSettlements: false,
    };
  }

  // Fallback to carrier
  return getCapabilitiesForRole('carrier');
}

/**
 * Extended capabilities for hybrid companies (moving company with fleet that also gives loads)
 * This would be determined by company settings, not just role
 */
export function getHybridCapabilities(): CompanyCapabilities {
  return {
    // Fleet tools - YES
    canUseFleetTools: true,
    canViewDrivers: true,
    canCreateTrips: true,
    canViewTrips: true,
    canViewCapacity: true,

    // Load management - BOTH
    canTakeLoads: true,
    canGiveLoads: true,
    canPostToMarketplace: true,
    canBrowseLoadBoard: true,
    canPostCapacity: true,

    // Partnerships - BOTH
    canManagePartners: true,
    canSeeCarrierRequests: true,
    canSeePostedJobs: true,
    canSeeLoadsGivenOut: true,

    // Compliance & Finance - YES
    canSeeCompliance: true,
    canSeeFinance: true,
    canSeeReceivables: true,
    canSeeSettlements: true,
  };
}

/**
 * Helper to determine if user should see fleet-focused or broker-focused dashboard
 */
export function getDashboardLayout(capabilities: CompanyCapabilities): 'carrier' | 'broker' | 'hybrid' {
  if (capabilities.canUseFleetTools && capabilities.canGiveLoads) {
    return 'hybrid';
  } else if (capabilities.canUseFleetTools) {
    return 'carrier';
  } else if (capabilities.canGiveLoads) {
    return 'broker';
  }
  return 'carrier';  // Default
}
