/**
 * LoadDetailViewModel - Unified model for displaying load details across dashboard contexts
 *
 * This normalizes the different data shapes from:
 * - getLoadById (owner's loads)
 * - getAssignedLoadDetails (carrier's assigned loads)
 * - getCarrierMarketplaceLoadDetail (carrier's marketplace loads)
 *
 * Into a single, consistent shape for the UI layer.
 */

// ============================================================================
// Types
// ============================================================================

export type LoadDetailContext = 'owner' | 'assigned_carrier' | 'marketplace_carrier';

export type UnifiedLoadStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'en_route_to_pickup'
  | 'at_pickup'
  | 'loading'
  | 'loaded'
  | 'in_transit'
  | 'at_delivery'
  | 'delivered'
  | 'completed'
  | 'canceled';

export type StatusVariant = 'gray' | 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'indigo' | 'orange';

export type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'orange';

export interface LocationInfo {
  city: string;
  state: string;
  zip?: string;
  address?: string;
  address2?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  phone?: string;
}

export interface EquipmentInfo {
  id: string;
  unitNumber: string;
  details?: string;
}

export interface TripInfo {
  id: string;
  tripNumber: string;
  driverName?: string;
}

export interface CompanyInfo {
  id: string;
  name: string;
  phone?: string;
  city?: string;
  state?: string;
}

export interface LoadBadge {
  label: string;
  variant: BadgeVariant;
  icon?: string;
}

export interface LoadDetailDates {
  loadDateStart?: string;
  loadDateEnd?: string;
  deliveryDateStart?: string;
  deliveryDateEnd?: string;
  availableDate?: string;
  firstAvailableDate?: string;
}

export interface LoadDetailSize {
  estimatedCuft?: number;
  actualCuft?: number;
  estimatedWeight?: number;
  piecesCount?: number;
}

export interface LoadDetailPricing {
  rate?: number;
  rateType?: 'flat' | 'per_cuft' | 'per_cwt' | 'percentage';
  ratePerCuft?: number;
  linehaul?: number;
  totalRevenue?: number;
  balanceDue?: number;
  carrierRate?: number;
}

export interface MessagingProps {
  loadId: string;
  loadNumber: string;
  companyId: string;
  userId: string;
  partnerCompanyId?: string;
  partnerCompanyName?: string;
  driverId?: string;
  driverName?: string;
}

export interface LoadDetailPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canPostToMarketplace: boolean;
  canAssignToTrip: boolean;
  canUpdateStatus: boolean;
  canAssignDriver: boolean;
  canAssignEquipment: boolean;
  canRatePartner: boolean;
  canViewPhotos: boolean;
  canViewTimeline: boolean;
}

export interface LoadDetailViewModel {
  // Core identifiers
  id: string;
  loadNumber: string;
  internalReference?: string;

  // Context
  context: LoadDetailContext;

  // Unified status
  displayStatus: UnifiedLoadStatus;
  statusLabel: string;
  statusVariant: StatusVariant;

  // Route
  origin: LocationInfo;
  destination: LocationInfo;

  // Dates
  dates: LoadDetailDates;

  // Size & Pricing
  size: LoadDetailSize;
  pricing: LoadDetailPricing;

  // Assignments
  driver?: DriverInfo;
  equipment?: {
    truck?: EquipmentInfo;
    trailer?: EquipmentInfo;
  };
  trip?: TripInfo;

  // Related companies
  ownerCompany: CompanyInfo;
  partnerCompany?: CompanyInfo;

  // Badges/Tags
  badges: LoadBadge[];

  // Special instructions
  specialInstructions?: string;

  // Messaging props (pre-computed)
  messagingProps: MessagingProps;

  // Permissions
  permissions: LoadDetailPermissions;

  // Type flags
  isFromMarketplace: boolean;
  isPickup: boolean;
  isRfd: boolean;
  isMarketplaceListed: boolean;

  // Raw data for actions/forms
  _raw: unknown;
  _context: {
    user: { id: string };
    workspaceCompany: { id: string; name: string };
  };
}

// ============================================================================
// Status Mapping Helpers
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; variant: StatusVariant }> = {
  pending: { label: 'Pending', variant: 'gray' },
  assigned: { label: 'Assigned', variant: 'blue' },
  unassigned: { label: 'Unassigned', variant: 'yellow' },
  accepted: { label: 'Accepted', variant: 'blue' },
  assigned_to_driver: { label: 'Assigned to Driver', variant: 'blue' },
  en_route_to_pickup: { label: 'En Route to Pickup', variant: 'purple' },
  at_pickup: { label: 'At Pickup', variant: 'purple' },
  loading: { label: 'Loading', variant: 'purple' },
  loaded: { label: 'Loaded', variant: 'indigo' },
  in_transit: { label: 'In Transit', variant: 'indigo' },
  at_delivery: { label: 'At Delivery', variant: 'green' },
  delivered: { label: 'Delivered', variant: 'green' },
  completed: { label: 'Completed', variant: 'gray' },
  canceled: { label: 'Canceled', variant: 'red' },
};

function normalizeStatus(
  status?: string | null,
  loadStatus?: string | null,
  operationalStatus?: string | null
): { displayStatus: UnifiedLoadStatus; statusLabel: string; statusVariant: StatusVariant } {
  // Priority: operational_status > load_status > status
  const rawStatus = operationalStatus || loadStatus || status || 'pending';
  const config = STATUS_CONFIG[rawStatus] || { label: rawStatus, variant: 'gray' as StatusVariant };

  return {
    displayStatus: rawStatus as UnifiedLoadStatus,
    statusLabel: config.label,
    statusVariant: config.variant,
  };
}

// ============================================================================
// Normalizer: Own Loads (getLoadById)
// ============================================================================

export function normalizeOwnLoad(
  load: Record<string, unknown>,
  user: { id: string },
  workspaceCompany: { id: string; name: string }
): LoadDetailViewModel {
  const status = normalizeStatus(load.status as string);

  // Extract company info
  const company = load.company as Record<string, unknown> | null;
  const companyArray = Array.isArray(company) ? company[0] : company;

  // Extract driver info
  const driver = load.driver as Record<string, unknown> | null;
  const driverArray = Array.isArray(driver) ? driver[0] : driver;

  // Extract equipment
  const truck = load.truck as Record<string, unknown> | null;
  const truckArray = Array.isArray(truck) ? truck[0] : truck;
  const trailer = load.trailer as Record<string, unknown> | null;
  const trailerArray = Array.isArray(trailer) ? trailer[0] : trailer;

  // Determine if this is a partner load
  const isPartnerLoad = load.load_source === 'partner' && companyArray;

  // Compute badges
  const badges: LoadBadge[] = [];
  if (load.marketplace_listed) {
    badges.push({ label: 'MARKETPLACE', variant: 'info' });
  }
  if (load.load_type === 'live_load') {
    badges.push({ label: 'LIVE LOAD', variant: 'purple' });
  }
  if (load.posting_type === 'pickup') {
    badges.push({ label: 'PICKUP', variant: 'orange' });
  }
  if (load.load_subtype === 'rfd') {
    badges.push({ label: 'RFD', variant: 'purple' });
  }

  const driverName = driverArray
    ? `${driverArray.first_name || ''} ${driverArray.last_name || ''}`.trim()
    : undefined;

  return {
    id: load.id as string,
    loadNumber: (load.load_number as string) || (load.id as string),
    internalReference: load.internal_reference as string | undefined,

    context: 'owner',

    ...status,

    origin: {
      city: (load.origin_city as string) || (load.pickup_city as string) || '',
      state: (load.origin_state as string) || (load.pickup_state as string) || '',
      zip: (load.origin_zip as string) || (load.pickup_postal_code as string),
      address: (load.origin_address as string) || (load.pickup_address_line1 as string),
      address2: (load.origin_address2 as string) || (load.pickup_address_line2 as string),
      contactName: load.origin_contact_name as string | undefined,
      contactPhone: load.origin_contact_phone as string | undefined,
      contactEmail: load.origin_contact_email as string | undefined,
      notes: load.origin_notes as string | undefined,
    },

    destination: {
      city: (load.destination_city as string) || (load.delivery_city as string) || (load.dropoff_city as string) || '',
      state: (load.destination_state as string) || (load.delivery_state as string) || (load.dropoff_state as string) || '',
      zip: (load.destination_zip as string) || (load.delivery_postal_code as string) || (load.dropoff_postal_code as string),
      address: (load.destination_address as string) || (load.delivery_address_line1 as string),
      address2: (load.destination_address2 as string) || (load.delivery_address_line2 as string),
      contactName: load.destination_contact_name as string | undefined,
      contactPhone: load.destination_contact_phone as string | undefined,
      contactEmail: load.destination_contact_email as string | undefined,
      notes: load.destination_notes as string | undefined,
    },

    dates: {
      loadDateStart: (load.proposed_load_date_start as string) || (load.pickup_date as string) || undefined,
      loadDateEnd: (load.proposed_load_date_end as string) || (load.pickup_window_end as string) || undefined,
      deliveryDateStart: (load.proposed_delivery_date_start as string) || (load.delivery_date as string) || undefined,
      deliveryDateEnd: (load.proposed_delivery_date_end as string) || (load.delivery_window_end as string) || undefined,
      availableDate: load.available_date as string | undefined,
      firstAvailableDate: load.first_available_date as string | undefined,
    },

    size: {
      estimatedCuft: (load.estimated_cuft as number) || (load.cubic_feet_estimate as number) || undefined,
      actualCuft: load.actual_cuft_loaded as number | undefined,
      estimatedWeight: (load.estimated_weight_lbs as number) || (load.weight_lbs_estimate as number) || undefined,
      piecesCount: load.pieces_count as number | undefined,
    },

    pricing: {
      rate: (load.company_rate as number) || (load.total_rate as number) || undefined,
      rateType: load.company_rate_type as LoadDetailPricing['rateType'],
      ratePerCuft: load.rate_per_cuft as number | undefined,
      linehaul: (load.linehaul_amount as number) || (load.linehaul_rate as number) || undefined,
      totalRevenue: (load.total_revenue as number) || (load.total_rate as number) || undefined,
      balanceDue: load.balance_due as number | undefined,
    },

    driver: driverArray
      ? {
          id: driverArray.id as string,
          name: driverName || 'Unknown',
          phone: driverArray.phone as string | undefined,
        }
      : undefined,

    equipment: {
      truck: truckArray
        ? {
            id: truckArray.id as string,
            unitNumber: truckArray.unit_number as string,
            details: [truckArray.year, truckArray.make, truckArray.model].filter(Boolean).join(' '),
          }
        : undefined,
      trailer: trailerArray
        ? {
            id: trailerArray.id as string,
            unitNumber: trailerArray.unit_number as string,
            details: [trailerArray.year, trailerArray.make, trailerArray.model].filter(Boolean).join(' '),
          }
        : undefined,
    },

    trip: load.trip_id
      ? {
          id: load.trip_id as string,
          tripNumber: (load.trip as Record<string, unknown>)?.trip_number as string || '',
        }
      : undefined,

    ownerCompany: workspaceCompany,

    partnerCompany: isPartnerLoad && companyArray
      ? {
          id: companyArray.id as string,
          name: companyArray.name as string,
          phone: companyArray.phone as string | undefined,
        }
      : undefined,

    badges,

    specialInstructions: load.special_instructions as string | undefined,

    messagingProps: {
      loadId: load.id as string,
      loadNumber: (load.load_number as string) || (load.id as string),
      companyId: workspaceCompany.id,
      userId: user.id,
      partnerCompanyId: isPartnerLoad && companyArray ? (companyArray.id as string) : undefined,
      partnerCompanyName: isPartnerLoad && companyArray ? (companyArray.name as string) : undefined,
      driverId: driverArray?.id as string | undefined,
      driverName,
    },

    permissions: {
      canEdit: true,
      canDelete: true,
      canPostToMarketplace: !load.marketplace_listed,
      canAssignToTrip: !load.trip_id,
      canUpdateStatus: true,
      canAssignDriver: true,
      canAssignEquipment: true,
      canRatePartner: false,
      canViewPhotos: true,
      canViewTimeline: false,
    },

    isFromMarketplace: false,
    isPickup: load.posting_type === 'pickup',
    isRfd: load.load_subtype === 'rfd',
    isMarketplaceListed: !!load.marketplace_listed,

    _raw: load,
    _context: { user, workspaceCompany },
  };
}

// ============================================================================
// Normalizer: Assigned Loads (getAssignedLoadDetails)
// ============================================================================

export function normalizeAssignedLoad(
  load: Record<string, unknown>,
  user: { id: string },
  workspaceCompany: { id: string; name: string }
): LoadDetailViewModel {
  const status = normalizeStatus(
    load.status as string,
    load.load_status as string,
    load.operational_status as string
  );

  // Extract source company
  const company = load.company as Record<string, unknown> | null;
  const companyArray = Array.isArray(company) ? company[0] : company;

  // Extract trip
  const trip = load.trip as Record<string, unknown> | null;
  const tripDriver = trip?.driver as Record<string, unknown> | null;
  const tripDriverArray = Array.isArray(tripDriver) ? tripDriver[0] : tripDriver;

  // Compute badges
  const badges: LoadBadge[] = [{ label: 'ASSIGNED', variant: 'info' }];
  if (load.posting_type === 'pickup') {
    badges.push({ label: 'PICKUP', variant: 'orange' });
  }
  if (load.load_subtype === 'rfd') {
    badges.push({ label: 'RFD', variant: 'purple' });
  }

  const driverName = load.assigned_driver_name as string | undefined;

  return {
    id: load.id as string,
    loadNumber: (load.load_number as string) || (load.id as string),
    internalReference: load.internal_reference as string | undefined,

    context: 'assigned_carrier',

    ...status,

    origin: {
      city: (load.origin_city as string) || '',
      state: (load.origin_state as string) || '',
      zip: load.origin_zip as string | undefined,
      address: load.origin_address as string | undefined,
      address2: load.origin_address2 as string | undefined,
      contactName: load.origin_contact_name as string | undefined,
      contactPhone: load.origin_contact_phone as string | undefined,
      contactEmail: load.origin_contact_email as string | undefined,
      notes: load.origin_notes as string | undefined,
    },

    destination: {
      city: (load.destination_city as string) || '',
      state: (load.destination_state as string) || '',
      zip: load.destination_zip as string | undefined,
      address: load.destination_address as string | undefined,
      address2: load.destination_address2 as string | undefined,
      contactName: load.destination_contact_name as string | undefined,
      contactPhone: load.destination_contact_phone as string | undefined,
      contactEmail: load.destination_contact_email as string | undefined,
      notes: load.destination_notes as string | undefined,
    },

    dates: {
      loadDateStart: load.proposed_load_date_start as string | undefined,
      loadDateEnd: load.proposed_load_date_end as string | undefined,
      deliveryDateStart: load.proposed_delivery_date_start as string | undefined,
      deliveryDateEnd: load.proposed_delivery_date_end as string | undefined,
      firstAvailableDate: load.first_available_date as string | undefined,
    },

    size: {
      estimatedCuft: load.estimated_cuft as number | undefined,
      actualCuft: load.actual_cuft_loaded as number | undefined,
      estimatedWeight: load.estimated_weight_lbs as number | undefined,
      piecesCount: load.pieces_count as number | undefined,
    },

    pricing: {
      rate: load.carrier_rate as number | undefined,
      rateType: load.carrier_rate_type as LoadDetailPricing['rateType'],
      ratePerCuft: load.rate_per_cuft as number | undefined,
      linehaul: load.linehaul_amount as number | undefined,
      carrierRate: load.carrier_rate as number | undefined,
      balanceDue: load.balance_due as number | undefined,
    },

    driver: load.assigned_driver_id
      ? {
          id: load.assigned_driver_id as string,
          name: driverName || 'Unknown',
          phone: load.assigned_driver_phone as string | undefined,
        }
      : undefined,

    equipment: {
      truck: load.truck_id
        ? {
            id: load.truck_id as string,
            unitNumber: load.truck_unit_number as string || '',
          }
        : undefined,
      trailer: load.trailer_id
        ? {
            id: load.trailer_id as string,
            unitNumber: load.trailer_unit_number as string || '',
          }
        : undefined,
    },

    trip: load.trip_id
      ? {
          id: load.trip_id as string,
          tripNumber: trip?.trip_number as string || '',
          driverName: tripDriverArray
            ? `${tripDriverArray.first_name || ''} ${tripDriverArray.last_name || ''}`.trim()
            : undefined,
        }
      : undefined,

    ownerCompany: workspaceCompany,

    partnerCompany: companyArray
      ? {
          id: companyArray.id as string,
          name: companyArray.name as string,
          phone: companyArray.phone as string | undefined,
          city: companyArray.city as string | undefined,
          state: companyArray.state as string | undefined,
        }
      : undefined,

    badges,

    specialInstructions: load.special_instructions as string | undefined,

    messagingProps: {
      loadId: load.id as string,
      loadNumber: (load.load_number as string) || (load.id as string),
      companyId: workspaceCompany.id,
      userId: user.id,
      partnerCompanyId: companyArray?.id as string | undefined,
      partnerCompanyName: companyArray?.name as string | undefined,
      driverId: load.assigned_driver_id as string | undefined,
      driverName,
    },

    permissions: {
      canEdit: false,
      canDelete: false,
      canPostToMarketplace: false,
      canAssignToTrip: !load.trip_id,
      canUpdateStatus: true,
      canAssignDriver: true,
      canAssignEquipment: true,
      canRatePartner: status.displayStatus === 'delivered',
      canViewPhotos: true,
      canViewTimeline: true,
    },

    isFromMarketplace: true,
    isPickup: load.posting_type === 'pickup',
    isRfd: load.load_subtype === 'rfd',
    isMarketplaceListed: false,

    _raw: load,
    _context: { user, workspaceCompany },
  };
}

// ============================================================================
// Normalizer: Marketplace Loads (getCarrierMarketplaceLoadDetail)
// ============================================================================

export function normalizeMarketplaceLoad(
  load: Record<string, unknown>,
  user: { id: string },
  workspaceCompany: { id: string; name: string }
): LoadDetailViewModel {
  const status = normalizeStatus(
    load.status as string,
    load.load_status as string,
    load.operational_status as string
  );

  // Extract source company
  const sourceCompany = load.source_company as Record<string, unknown> | null;

  // Extract trip
  const trip = load.trip as Record<string, unknown> | null;
  const tripDriver = trip?.driver as Record<string, unknown> | null;
  const tripDriverArray = Array.isArray(tripDriver) ? tripDriver[0] : tripDriver;

  // Compute badges
  const badges: LoadBadge[] = [{ label: 'FROM MARKETPLACE', variant: 'info' }];
  if (load.posting_type === 'pickup') {
    badges.push({ label: 'PICKUP', variant: 'orange' });
  } else if (load.load_subtype === 'rfd') {
    badges.push({ label: 'RFD', variant: 'purple' });
  } else {
    badges.push({ label: 'LIVE LOAD', variant: 'info' });
  }

  const driverName = load.assigned_driver_name as string | undefined;

  return {
    id: load.id as string,
    loadNumber: (load.load_number as string) || (load.id as string),
    internalReference: load.internal_reference as string | undefined,

    context: 'marketplace_carrier',

    ...status,

    origin: {
      city: (load.origin_city as string) || '',
      state: (load.origin_state as string) || '',
      zip: load.origin_zip as string | undefined,
      address: load.origin_address as string | undefined,
      address2: load.origin_address2 as string | undefined,
      contactName: load.origin_contact_name as string | undefined,
      contactPhone: load.origin_contact_phone as string | undefined,
      contactEmail: load.origin_contact_email as string | undefined,
      notes: load.origin_notes as string | undefined,
    },

    destination: {
      city: (load.destination_city as string) || '',
      state: (load.destination_state as string) || '',
      zip: load.destination_zip as string | undefined,
      address: load.destination_address as string | undefined,
      address2: load.destination_address2 as string | undefined,
      contactName: load.destination_contact_name as string | undefined,
      contactPhone: load.destination_contact_phone as string | undefined,
      contactEmail: load.destination_contact_email as string | undefined,
      notes: load.destination_notes as string | undefined,
    },

    dates: {
      loadDateStart: load.proposed_load_date_start as string | undefined,
      loadDateEnd: load.proposed_load_date_end as string | undefined,
      deliveryDateStart: load.proposed_delivery_date_start as string | undefined,
      deliveryDateEnd: load.proposed_delivery_date_end as string | undefined,
    },

    size: {
      estimatedCuft: load.estimated_cuft as number | undefined,
      actualCuft: load.actual_cuft_loaded as number | undefined,
      estimatedWeight: load.estimated_weight_lbs as number | undefined,
      piecesCount: load.pieces_count as number | undefined,
    },

    pricing: {
      rate: load.carrier_rate as number | undefined,
      rateType: load.carrier_rate_type as LoadDetailPricing['rateType'],
      ratePerCuft: load.rate_per_cuft as number | undefined,
      carrierRate: load.carrier_rate as number | undefined,
      balanceDue: load.balance_due as number | undefined,
    },

    driver: load.assigned_driver_id
      ? {
          id: load.assigned_driver_id as string,
          name: driverName || 'Unknown',
        }
      : undefined,

    equipment: undefined, // Marketplace loads don't typically show equipment

    trip: load.trip_id
      ? {
          id: load.trip_id as string,
          tripNumber: trip?.trip_number as string || '',
          driverName: tripDriverArray
            ? `${tripDriverArray.first_name || ''} ${tripDriverArray.last_name || ''}`.trim()
            : undefined,
        }
      : undefined,

    ownerCompany: workspaceCompany,

    partnerCompany: sourceCompany
      ? {
          id: sourceCompany.id as string,
          name: (load.source_company_name as string) || (sourceCompany.name as string),
          phone: sourceCompany.phone as string | undefined,
          city: sourceCompany.city as string | undefined,
          state: sourceCompany.state as string | undefined,
        }
      : undefined,

    badges,

    specialInstructions: load.special_instructions as string | undefined,

    messagingProps: {
      loadId: load.id as string,
      loadNumber: (load.load_number as string) || (load.id as string),
      companyId: workspaceCompany.id,
      userId: user.id,
      partnerCompanyId: sourceCompany?.id as string | undefined,
      partnerCompanyName: (load.source_company_name as string) || (sourceCompany?.name as string),
      driverId: load.assigned_driver_id as string | undefined,
      driverName,
    },

    permissions: {
      canEdit: false,
      canDelete: false,
      canPostToMarketplace: false,
      canAssignToTrip: !load.trip_id,
      canUpdateStatus: true,
      canAssignDriver: false,
      canAssignEquipment: false,
      canRatePartner: false,
      canViewPhotos: false,
      canViewTimeline: false,
    },

    isFromMarketplace: true,
    isPickup: load.posting_type === 'pickup',
    isRfd: load.load_subtype === 'rfd',
    isMarketplaceListed: false,

    _raw: load,
    _context: { user, workspaceCompany },
  };
}

// ============================================================================
// Utility: Format helpers for consistent display
// ============================================================================

export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start) return 'TBD';
  const startDate = new Date(start);
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (!end || end === start) return startStr;

  const endDate = new Date(end);
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

export function formatRate(
  rate?: number | null,
  rateType?: string | null,
  cuft?: number | null
): string {
  if (!rate) return 'TBD';
  const total = cuft ? rate * cuft : null;
  if (rateType === 'per_cuft') {
    return total ? `$${rate.toFixed(2)}/cf ($${total.toLocaleString()})` : `$${rate.toFixed(2)}/cf`;
  }
  return `$${rate.toLocaleString()}`;
}

export function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null) return 'N/A';
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatLocation(location: LocationInfo): string {
  const parts = [location.city, location.state].filter(Boolean);
  return parts.join(', ') || 'Unknown';
}

export function formatFullAddress(location: LocationInfo): string {
  const parts = [
    location.address,
    location.address2,
    `${location.city}, ${location.state} ${location.zip || ''}`.trim(),
  ].filter(Boolean);
  return parts.join('\n') || formatLocation(location);
}
