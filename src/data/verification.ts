import { createClient } from '@/lib/supabase-server';

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface VerificationRequirement {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  required: boolean;
  actionHref?: string; // Where to go to complete this requirement
}

export interface FMCSAData {
  verified: boolean;
  verifiedAt: string | null;
  lastChecked: string | null;
  legalName: string | null;
  dbaName: string | null;
  statusCode: string | null;
  allowedToOperate: boolean;
  commonAuthority: string | null;
  contractAuthority: string | null;
  brokerAuthority: string | null;
  bipdInsurance: number | null; // In thousands
  totalDrivers: number | null;
  totalPowerUnits: number | null;
  operationType: string | null;
}

export interface VerificationState {
  status: VerificationStatus;
  requirements: VerificationRequirement[];
  completedCount: number;
  totalRequired: number;
  percentComplete: number;
  fmcsa: FMCSAData | null;
}

/**
 * Get verification requirements and status for a company
 */
export async function getVerificationState(companyId: string): Promise<VerificationState> {
  const supabase = await createClient();

  // Get company data including FMCSA fields
  const { data: company } = await supabase
    .from('companies')
    .select(`
      id, dot_number, mc_number, is_carrier, is_broker, is_workspace_company,
      fmcsa_verified, fmcsa_verified_at, fmcsa_last_checked,
      fmcsa_legal_name, fmcsa_dba_name, fmcsa_status_code,
      fmcsa_allowed_to_operate, fmcsa_common_authority, fmcsa_contract_authority,
      fmcsa_broker_authority, fmcsa_bipd_insurance_on_file,
      fmcsa_total_drivers, fmcsa_total_power_units, fmcsa_operation_type
    `)
    .eq('id', companyId)
    .single();

  if (!company) {
    return {
      status: 'unverified',
      requirements: [],
      completedCount: 0,
      totalRequired: 0,
      percentComplete: 0,
      fmcsa: null,
    };
  }

  // Build FMCSA data object
  const fmcsa: FMCSAData | null = company.fmcsa_last_checked
    ? {
        verified: company.fmcsa_verified ?? false,
        verifiedAt: company.fmcsa_verified_at,
        lastChecked: company.fmcsa_last_checked,
        legalName: company.fmcsa_legal_name,
        dbaName: company.fmcsa_dba_name,
        statusCode: company.fmcsa_status_code,
        allowedToOperate: company.fmcsa_allowed_to_operate ?? false,
        commonAuthority: company.fmcsa_common_authority,
        contractAuthority: company.fmcsa_contract_authority,
        brokerAuthority: company.fmcsa_broker_authority,
        bipdInsurance: company.fmcsa_bipd_insurance_on_file,
        totalDrivers: company.fmcsa_total_drivers,
        totalPowerUnits: company.fmcsa_total_power_units,
        operationType: company.fmcsa_operation_type,
      }
    : null;

  // Build requirements based on company type
  const requirements: VerificationRequirement[] = [];

  // For carriers and owner-operators, DOT verification via FMCSA
  if (company.is_carrier) {
    // DOT verification via FMCSA
    requirements.push({
      id: 'fmcsa_dot',
      label: 'DOT Number (FMCSA Verified)',
      description: company.fmcsa_verified
        ? `Verified: ${company.fmcsa_legal_name || company.dot_number}`
        : 'Verify your DOT number with FMCSA',
      completed: company.fmcsa_verified ?? false,
      required: true,
      actionHref: '/dashboard/settings/company-profile',
    });

    // MC Number (optional, just informational)
    if (company.mc_number) {
      requirements.push({
        id: 'mc_number',
        label: 'MC Number',
        description: `MC-${company.mc_number}`,
        completed: true,
        required: false,
      });
    }

    // Insurance - now pulled from FMCSA
    const hasInsurance = (company.fmcsa_bipd_insurance_on_file ?? 0) > 0;
    requirements.push({
      id: 'insurance',
      label: 'Liability Insurance',
      description: hasInsurance
        ? `$${(company.fmcsa_bipd_insurance_on_file! * 1000).toLocaleString()} on file with FMCSA`
        : 'Insurance information from FMCSA',
      completed: hasInsurance,
      required: true,
    });
  }

  // For brokers/moving companies that post loads
  if (company.is_broker && !company.is_carrier) {
    // DOT verification (optional for brokers)
    requirements.push({
      id: 'fmcsa_dot',
      label: 'DOT Number (FMCSA Verified)',
      description: company.fmcsa_verified
        ? `Verified: ${company.fmcsa_legal_name || company.dot_number}`
        : 'Verify your DOT number with FMCSA (optional)',
      completed: company.fmcsa_verified ?? false,
      required: false,
      actionHref: '/dashboard/settings/company-profile',
    });

    // Broker authority
    const hasBrokerAuthority = company.fmcsa_broker_authority === 'A';
    if (company.dot_number) {
      requirements.push({
        id: 'broker_authority',
        label: 'Broker Authority',
        description: hasBrokerAuthority ? 'Active broker authority' : 'No active broker authority',
        completed: hasBrokerAuthority,
        required: false,
      });
    }
  }

  // Calculate status based on FMCSA verification
  const requiredItems = requirements.filter((r) => r.required);
  const completedRequired = requiredItems.filter((r) => r.completed).length;
  const totalRequired = requiredItems.length;

  let status: VerificationStatus = 'unverified';

  // Primary check: FMCSA verified
  if (company.fmcsa_verified) {
    status = 'verified';
  } else if (company.dot_number && !company.fmcsa_last_checked) {
    // Has DOT but hasn't been checked yet
    status = 'pending';
  } else if (completedRequired > 0 && completedRequired < totalRequired) {
    status = 'pending';
  }

  const completedCount = requirements.filter((r) => r.completed).length;
  const percentComplete = requirements.length > 0
    ? Math.round((completedCount / requirements.length) * 100)
    : 0;

  return {
    status,
    requirements,
    completedCount,
    totalRequired,
    percentComplete,
    fmcsa,
  };
}

/**
 * Get verification state for the current user's workspace company
 */
export async function getVerificationStateForUser(userId: string): Promise<VerificationState | null> {
  const supabase = await createClient();

  // Get user's workspace company
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_workspace_company', true)
    .single();

  if (!company) {
    return null;
  }

  return getVerificationState(company.id);
}

/**
 * Quick check if a company is verified (for display purposes)
 */
export async function isCompanyVerified(companyId: string): Promise<boolean> {
  const state = await getVerificationState(companyId);
  return state.status === 'verified';
}
