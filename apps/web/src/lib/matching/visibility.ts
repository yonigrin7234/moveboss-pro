/**
 * Visibility Resolution for Smart Load Matching
 * Determines effective visibility settings using hierarchy:
 * Trip override > Driver default > Company default
 */

export type CapacityVisibility = 'private' | 'partners_only' | 'public';

export interface EffectiveVisibility {
  shareLocation: boolean;
  shareCapacity: boolean;
  capacityVisibility: CapacityVisibility;
}

export interface TripVisibilitySettings {
  share_location: boolean | null;
  share_capacity: boolean | null;
  trip_capacity_visibility: CapacityVisibility | null;
}

export interface DriverVisibilitySettings {
  location_sharing_enabled: boolean;
  auto_post_capacity: boolean;
  capacity_visibility: CapacityVisibility;
}

export interface CompanyVisibilityDefaults {
  default_location_sharing: boolean;
  default_capacity_visibility: CapacityVisibility;
}

export interface VisibilityInputs {
  trip: TripVisibilitySettings;
  driver: DriverVisibilitySettings;
  companySettings: CompanyVisibilityDefaults;
}

/**
 * Resolves effective visibility using hierarchy:
 * Trip override > Driver default > Company default
 */
export function getEffectiveVisibility(inputs: VisibilityInputs): EffectiveVisibility {
  const { trip, driver, companySettings } = inputs;

  return {
    shareLocation:
      trip.share_location ??
      driver.location_sharing_enabled ??
      companySettings.default_location_sharing ??
      false,

    shareCapacity:
      trip.share_capacity ??
      driver.auto_post_capacity ??
      false,

    capacityVisibility:
      trip.trip_capacity_visibility ??
      driver.capacity_visibility ??
      companySettings.default_capacity_visibility ??
      'private',
  };
}

/**
 * Check if a driver's capacity should be visible to a specific company
 */
export function isCapacityVisibleTo(
  visibility: CapacityVisibility,
  requestingCompanyId: string,
  ownerCompanyId: string,
  partnerCompanyIds: string[]
): boolean {
  // Private - only owner can see
  if (visibility === 'private') {
    return requestingCompanyId === ownerCompanyId;
  }

  // Partners only - owner + partners can see
  if (visibility === 'partners_only') {
    return (
      requestingCompanyId === ownerCompanyId ||
      partnerCompanyIds.includes(requestingCompanyId)
    );
  }

  // Public - anyone can see
  return true;
}
