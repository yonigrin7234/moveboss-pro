export type DashboardMode = 'carrier' | 'broker' | 'hybrid';

export interface CompanyCapabilities {
  is_broker?: boolean;
  is_carrier?: boolean;
}

export function getDashboardMode(company: CompanyCapabilities): DashboardMode {
  if (company?.is_broker && company?.is_carrier) return 'hybrid';
  if (company?.is_carrier) return 'carrier';
  return 'broker';
}

/**
 * Role predicates for determining UI visibility
 */

/** Pure carrier: can haul but CANNOT post to marketplace */
export function isPureCarrier(company: CompanyCapabilities | null | undefined): boolean {
  return company?.is_carrier === true && company?.is_broker !== true;
}

/** Pure broker: can post but does NOT have own trucks/drivers */
export function isBrokerOnly(company: CompanyCapabilities | null | undefined): boolean {
  return company?.is_broker === true && company?.is_carrier !== true;
}

/** Moving company: can both post and haul (hybrid) */
export function isMovingCompany(company: CompanyCapabilities | null | undefined): boolean {
  return company?.is_broker === true && company?.is_carrier === true;
}

/** Can post loads/pickups to marketplace (brokers and moving companies) */
export function canPostToMarketplace(company: CompanyCapabilities | null | undefined): boolean {
  return company?.is_broker === true;
}

/** Can haul loads (carriers and moving companies) */
export function canHaulLoads(company: CompanyCapabilities | null | undefined): boolean {
  return company?.is_carrier === true;
}

/** Should show driver management sections */
export function hasDriverManagement(company: CompanyCapabilities | null | undefined): boolean {
  return company?.is_carrier === true;
}

/** Should show dispatch/assignment sections */
export function hasDispatchCapabilities(company: CompanyCapabilities | null | undefined): boolean {
  return company?.is_carrier === true;
}
