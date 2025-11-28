/**
 * FMCSA QCMobile API Service
 *
 * Provides carrier verification via the Federal Motor Carrier Safety Administration API.
 * API Documentation: https://mobile.fmcsa.dot.gov/QCDevsite/docs/qcApi
 */

const FMCSA_BASE_URL = 'https://mobile.fmcsa.dot.gov/qc/services';

// Types for FMCSA API responses

export type AuthorityStatus = 'A' | 'I' | 'N' | null; // Active, Inactive, None

export interface FMCSACarrierOperation {
  carrierOperationCode: string;
  carrierOperationDesc: string;
}

export interface FMCSACensusType {
  censusType: string;
  censusTypeDesc: string;
  censusTypeId: number;
}

export interface FMCSACargoCarried {
  cargoCarriedId: number;
  cargoCarriedDesc: string;
}

// Known cargo type IDs for HHG (Household Goods)
export const HHG_CARGO_IDS = [
  7,  // Household Goods
  17, // Household Goods - Unspecified
];

// Cargo type descriptions that indicate HHG authorization
export const HHG_CARGO_DESCRIPTIONS = [
  'Household Goods',
  'HHG',
];

export interface FMCSACarrier {
  // Core identification
  dotNumber: number;
  legalName: string;
  dbaName: string | null;
  ein: number | null;

  // Operating status
  allowedToOperate: 'Y' | 'N';
  statusCode: 'A' | 'I'; // Active or Inactive
  oosDate: string | null; // Out of service date

  // Authority status
  commonAuthorityStatus: AuthorityStatus;
  contractAuthorityStatus: AuthorityStatus;
  brokerAuthorityStatus: AuthorityStatus;

  // Insurance
  bipdInsuranceOnFile: string | null; // Amount in thousands (e.g., "1000" = $1M)
  bipdInsuranceRequired: 'Y' | 'N' | 'u' | null;
  bipdRequiredAmount: string | null; // Minimum required in thousands
  cargoInsuranceOnFile: string | null;
  cargoInsuranceRequired: 'Y' | 'N' | 'u' | null;
  bondInsuranceOnFile: string | null;
  bondInsuranceRequired: 'Y' | 'N' | 'u' | null;

  // Fleet info
  totalDrivers: number | null;
  totalPowerUnits: number | null;
  isPassengerCarrier: 'Y' | 'N' | null;

  // Address
  phyStreet: string | null;
  phyCity: string | null;
  phyState: string | null;
  phyZipcode: string | null;
  phyCountry: string | null;

  // Safety data
  crashTotal: number;
  fatalCrash: number;
  injCrash: number;
  towawayCrash: number;
  vehicleInsp: number;
  vehicleOosInsp: number;
  vehicleOosRate: number;
  driverInsp: number;
  driverOosInsp: number;
  driverOosRate: number;
  hazmatInsp: number;
  hazmatOosInsp: number;
  hazmatOosRate: number;

  // Safety ratings
  safetyRating: string | null;
  safetyRatingDate: string | null;

  // Carrier operation type
  carrierOperation: FMCSACarrierOperation | null;
  censusTypeId: FMCSACensusType | null;

  // MCS-150 status
  mcs150Outdated: 'Y' | 'N';
}

export interface FMCSACarrierResponse {
  content: {
    carrier: FMCSACarrier;
    _links: Record<string, { href: string }>;
  };
  retrievalDate: string;
}

export interface FMCSASearchResult {
  content: Array<{
    carrier: FMCSACarrier;
    _links: Record<string, { href: string }>;
  }>;
  retrievalDate: string;
}

export interface FMCSAVerificationResult {
  found: boolean;
  verified: boolean;
  carrier: FMCSACarrier | null;
  cargoCarried: FMCSACargoCarried[];
  hhgAuthorized: boolean;
  verificationDetails: {
    dotValid: boolean;
    allowedToOperate: boolean;
    isActive: boolean;
    hasAuthority: boolean;
    insuranceMeetsRequirements: boolean;
    authorityTypes: string[];
    hhgAuthorized: boolean;
  } | null;
  error?: string;
}

/**
 * Get the FMCSA API key from environment
 */
function getApiKey(): string {
  const key = process.env.FMCSA_API_KEY;
  if (!key) {
    throw new Error('FMCSA_API_KEY environment variable is not set');
  }
  return key;
}

/**
 * Lookup a carrier by DOT number
 */
export async function getCarrierByDOT(dotNumber: string | number): Promise<FMCSACarrier | null> {
  const apiKey = getApiKey();
  const url = `${FMCSA_BASE_URL}/carriers/${dotNumber}?webKey=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`FMCSA API error: ${response.status}`);
    }

    const data: FMCSACarrierResponse = await response.json();
    return data.content?.carrier || null;
  } catch (error) {
    console.error('FMCSA API error:', error);
    throw error;
  }
}

/**
 * Search carriers by name
 */
export async function searchCarriersByName(
  name: string,
  options: { start?: number; size?: number } = {}
): Promise<FMCSACarrier[]> {
  const apiKey = getApiKey();
  const { start = 0, size = 20 } = options;
  const encodedName = encodeURIComponent(name);
  const url = `${FMCSA_BASE_URL}/carriers/name/${encodedName}?start=${start}&size=${size}&webKey=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`FMCSA API error: ${response.status}`);
    }

    const data: FMCSASearchResult = await response.json();
    return data.content?.map(item => item.carrier) || [];
  } catch (error) {
    console.error('FMCSA API error:', error);
    throw error;
  }
}

/**
 * Get cargo types carried by a carrier
 */
export async function getCargoCarried(dotNumber: string | number): Promise<FMCSACargoCarried[]> {
  const apiKey = getApiKey();
  const url = `${FMCSA_BASE_URL}/carriers/${dotNumber}/cargo-carried?webKey=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      if (response.status === 404) return [];
      console.error(`FMCSA cargo API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    // The API returns { content: { carrier: { cargoCarried: [...] } } }
    const cargoList = data?.content?.carrier?.cargoCarried;
    if (!Array.isArray(cargoList)) return [];

    return cargoList.map((item: any) => ({
      cargoCarriedId: item.cargoClassId || item.cargoCarriedId,
      cargoCarriedDesc: item.cargoClassDesc || item.cargoCarriedDesc,
    }));
  } catch (error) {
    console.error('FMCSA cargo API error:', error);
    return [];
  }
}

/**
 * Check if carrier is authorized for Household Goods (HHG)
 */
export function isHHGAuthorized(cargoCarried: FMCSACargoCarried[]): boolean {
  return cargoCarried.some(cargo =>
    HHG_CARGO_IDS.includes(cargo.cargoCarriedId) ||
    HHG_CARGO_DESCRIPTIONS.some(desc =>
      cargo.cargoCarriedDesc?.toLowerCase().includes(desc.toLowerCase())
    )
  );
}

/**
 * Lookup a carrier by MC/MX/FF docket number
 */
export async function getCarrierByMC(mcNumber: string | number): Promise<FMCSACarrier | null> {
  const apiKey = getApiKey();
  // Remove "MC" prefix if present
  const cleanNumber = String(mcNumber).replace(/^MC-?/i, '');
  const url = `${FMCSA_BASE_URL}/carriers/docket-number/${cleanNumber}?webKey=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`FMCSA API error: ${response.status}`);
    }

    const data: FMCSASearchResult = await response.json();
    return data.content?.[0]?.carrier || null;
  } catch (error) {
    console.error('FMCSA API error:', error);
    throw error;
  }
}

/**
 * Verify a carrier's operating status and authority
 * Returns comprehensive verification result including HHG authorization
 */
export async function verifyCarrier(dotNumber: string | number): Promise<FMCSAVerificationResult> {
  try {
    // Fetch carrier data and cargo types in parallel
    const [carrier, cargoCarried] = await Promise.all([
      getCarrierByDOT(dotNumber),
      getCargoCarried(dotNumber),
    ]);

    if (!carrier) {
      return {
        found: false,
        verified: false,
        carrier: null,
        cargoCarried: [],
        hhgAuthorized: false,
        verificationDetails: null,
        error: 'DOT number not found in FMCSA database',
      };
    }

    // Check operating status
    const allowedToOperate = carrier.allowedToOperate === 'Y';
    const isActive = carrier.statusCode === 'A';

    // Check authority types
    const authorityTypes: string[] = [];
    if (carrier.commonAuthorityStatus === 'A') authorityTypes.push('Common');
    if (carrier.contractAuthorityStatus === 'A') authorityTypes.push('Contract');
    if (carrier.brokerAuthorityStatus === 'A') authorityTypes.push('Broker');

    const hasAuthority = authorityTypes.length > 0;

    // Check HHG authorization
    const hhgAuthorized = isHHGAuthorized(cargoCarried);

    // Check insurance
    const insuranceOnFile = parseInt(carrier.bipdInsuranceOnFile || '0', 10);
    const insuranceRequired = parseInt(carrier.bipdRequiredAmount || '0', 10);
    const insuranceMeetsRequirements =
      carrier.bipdInsuranceRequired !== 'Y' || insuranceOnFile >= insuranceRequired;

    // Overall verification - carrier is verified if:
    // 1. Allowed to operate
    // 2. Status is active
    // 3. Has at least one active authority (for interstate carriers) OR is intrastate-only
    // 4. Insurance meets requirements (if required)
    const isIntrastateOnly = carrier.carrierOperation?.carrierOperationCode === 'C';
    const verified =
      allowedToOperate &&
      isActive &&
      (hasAuthority || isIntrastateOnly) &&
      insuranceMeetsRequirements;

    return {
      found: true,
      verified,
      carrier,
      cargoCarried,
      hhgAuthorized,
      verificationDetails: {
        dotValid: true,
        allowedToOperate,
        isActive,
        hasAuthority,
        insuranceMeetsRequirements,
        authorityTypes,
        hhgAuthorized,
      },
    };
  } catch (error) {
    return {
      found: false,
      verified: false,
      carrier: null,
      cargoCarried: [],
      hhgAuthorized: false,
      verificationDetails: null,
      error: error instanceof Error ? error.message : 'Failed to verify carrier',
    };
  }
}

/**
 * Format insurance amount for display
 */
export function formatInsuranceAmount(amountInThousands: string | null): string {
  if (!amountInThousands || amountInThousands === '0') return 'None on file';
  const amount = parseInt(amountInThousands, 10) * 1000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format authority status for display
 */
export function formatAuthorityStatus(status: AuthorityStatus): string {
  switch (status) {
    case 'A': return 'Active';
    case 'I': return 'Inactive';
    case 'N': return 'None';
    default: return 'Unknown';
  }
}

/**
 * Get a human-readable verification status message
 */
export function getVerificationMessage(result: FMCSAVerificationResult): string {
  if (!result.found) {
    return result.error || 'DOT number not found';
  }

  if (!result.verificationDetails) {
    return 'Unable to verify';
  }

  const { allowedToOperate, isActive, hasAuthority, insuranceMeetsRequirements } = result.verificationDetails;

  if (!allowedToOperate) {
    return 'Carrier is not allowed to operate';
  }

  if (!isActive) {
    return 'Carrier status is inactive';
  }

  if (!hasAuthority && result.carrier?.carrierOperation?.carrierOperationCode !== 'C') {
    return 'No active operating authority';
  }

  if (!insuranceMeetsRequirements) {
    return 'Insurance does not meet requirements';
  }

  return 'Verified - carrier is in good standing';
}
