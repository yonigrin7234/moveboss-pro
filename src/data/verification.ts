import { createClient } from '@/lib/supabase-server';

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface VerificationRequirement {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export interface VerificationState {
  status: VerificationStatus;
  requirements: VerificationRequirement[];
  completedCount: number;
  totalRequired: number;
  percentComplete: number;
}

/**
 * Get verification requirements and status for a company
 */
export async function getVerificationState(companyId: string): Promise<VerificationState> {
  const supabase = await createClient();

  // Get company data
  const { data: company } = await supabase
    .from('companies')
    .select('id, dot_number, mc_number, is_carrier, is_broker, is_workspace_company')
    .eq('id', companyId)
    .single();

  if (!company) {
    return {
      status: 'unverified',
      requirements: [],
      completedCount: 0,
      totalRequired: 0,
      percentComplete: 0,
    };
  }

  // Check for compliance documents (insurance)
  const { data: insuranceDocs } = await supabase
    .from('compliance_documents')
    .select('id, status')
    .eq('company_id', companyId)
    .eq('document_type', 'insurance_certificate')
    .eq('status', 'approved')
    .limit(1);

  const hasApprovedInsurance = (insuranceDocs?.length ?? 0) > 0;

  // Build requirements based on company type
  const requirements: VerificationRequirement[] = [];

  // For carriers and owner-operators, DOT/MC is important
  if (company.is_carrier) {
    requirements.push({
      id: 'dot_number',
      label: 'DOT Number',
      description: 'Add your USDOT number for carrier verification',
      completed: !!company.dot_number,
      required: true,
    });

    requirements.push({
      id: 'mc_number',
      label: 'MC Number',
      description: 'Add your Motor Carrier number',
      completed: !!company.mc_number,
      required: false, // Not all carriers have MC
    });

    requirements.push({
      id: 'insurance',
      label: 'Insurance Certificate',
      description: 'Upload a valid Certificate of Insurance (COI)',
      completed: hasApprovedInsurance,
      required: true,
    });
  }

  // For brokers/moving companies that post loads
  if (company.is_broker && !company.is_carrier) {
    requirements.push({
      id: 'dot_number',
      label: 'DOT Number',
      description: 'Add your USDOT number (if applicable)',
      completed: !!company.dot_number,
      required: false,
    });

    requirements.push({
      id: 'mc_number',
      label: 'MC/FF Number',
      description: 'Add your broker authority number',
      completed: !!company.mc_number,
      required: false,
    });
  }

  // Calculate status
  const requiredItems = requirements.filter((r) => r.required);
  const completedRequired = requiredItems.filter((r) => r.completed).length;
  const totalRequired = requiredItems.length;

  let status: VerificationStatus = 'unverified';
  if (totalRequired > 0 && completedRequired === totalRequired) {
    status = 'verified';
  } else if (completedRequired > 0) {
    status = 'pending';
  }

  // If no requirements (e.g., broker with no required docs), check if they have any credentials
  if (totalRequired === 0) {
    const hasAnyCredentials = !!company.dot_number || !!company.mc_number;
    status = hasAnyCredentials ? 'verified' : 'unverified';
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
