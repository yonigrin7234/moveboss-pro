import { createClient } from '@/lib/supabase-server';

export interface ComplianceDocument {
  id: string;
  company_id: string;
  partnership_id: string | null;
  owner_id: string | null;
  document_type: string;
  document_name: string;
  description: string | null;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  status: 'pending_review' | 'approved' | 'rejected' | 'expired';
  reviewed_at: string | null;
  reviewed_by_id: string | null;
  review_notes: string | null;
  insurance_company: string | null;
  policy_number: string | null;
  coverage_amount: number | null;
  signed_by_name: string | null;
  signed_by_title: string | null;
  signed_at: string | null;
  signature_photo: string | null;
  expiration_alert_sent: boolean;
  expiration_alert_sent_at: string | null;
  version: number;
  previous_version_id: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  company?: { id: string; name: string };
  partnership?: { id: string; company_a: { name: string }; company_b: { name: string } } | null;
}

export const DOCUMENT_TYPES = [
  { value: 'w9', label: 'W-9 Form', category: 'tax' },
  { value: 'hauling_agreement', label: 'Hauling Agreement', category: 'agreement' },
  { value: 'insurance_certificate', label: 'Insurance Certificate', category: 'insurance' },
  { value: 'mc_authority', label: 'MC Authority', category: 'authority' },
  { value: 'dot_registration', label: 'DOT Registration', category: 'authority' },
  { value: 'cargo_insurance', label: 'Cargo Insurance', category: 'insurance' },
  { value: 'liability_insurance', label: 'Liability Insurance', category: 'insurance' },
  { value: 'workers_comp', label: "Workers' Compensation", category: 'insurance' },
  { value: 'operating_authority', label: 'Operating Authority', category: 'authority' },
  { value: 'safety_rating', label: 'Safety Rating', category: 'authority' },
  { value: 'other', label: 'Other Document', category: 'other' },
] as const;

export const DOCUMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_review: { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-600 dark:text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
  expired: { label: 'Expired', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400' },
};

// Get all compliance documents for an owner
export async function getComplianceDocuments(ownerId: string): Promise<ComplianceDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('compliance_documents')
    .select(`
      *,
      company:companies!compliance_documents_company_id_fkey(id, name)
    `)
    .eq('owner_id', ownerId)
    .eq('is_current', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching compliance documents:', error);
    return [];
  }

  return data || [];
}

// Get documents by company
export async function getDocumentsByCompany(
  ownerId: string,
  companyId: string
): Promise<ComplianceDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('compliance_documents')
    .select(`
      *,
      company:companies!compliance_documents_company_id_fkey(id, name)
    `)
    .eq('owner_id', ownerId)
    .eq('company_id', companyId)
    .eq('is_current', true)
    .order('document_type', { ascending: true });

  if (error) {
    console.error('Error fetching company documents:', error);
    return [];
  }

  return data || [];
}

// Get documents by status
export async function getDocumentsByStatus(
  ownerId: string,
  status: 'pending_review' | 'approved' | 'rejected' | 'expired'
): Promise<ComplianceDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('compliance_documents')
    .select(`
      *,
      company:companies!compliance_documents_company_id_fkey(id, name)
    `)
    .eq('owner_id', ownerId)
    .eq('status', status)
    .eq('is_current', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents by status:', error);
    return [];
  }

  return data || [];
}

// Get expiring documents (within next 30 days)
export async function getExpiringDocuments(
  ownerId: string,
  daysAhead: number = 30
): Promise<ComplianceDocument[]> {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('compliance_documents')
    .select(`
      *,
      company:companies!compliance_documents_company_id_fkey(id, name)
    `)
    .eq('owner_id', ownerId)
    .eq('is_current', true)
    .eq('status', 'approved')
    .not('expiration_date', 'is', null)
    .gte('expiration_date', today)
    .lte('expiration_date', futureDateStr)
    .order('expiration_date', { ascending: true });

  if (error) {
    console.error('Error fetching expiring documents:', error);
    return [];
  }

  return data || [];
}

// Get expired documents
export async function getExpiredDocuments(ownerId: string): Promise<ComplianceDocument[]> {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('compliance_documents')
    .select(`
      *,
      company:companies!compliance_documents_company_id_fkey(id, name)
    `)
    .eq('owner_id', ownerId)
    .eq('is_current', true)
    .not('expiration_date', 'is', null)
    .lt('expiration_date', today)
    .order('expiration_date', { ascending: true });

  if (error) {
    console.error('Error fetching expired documents:', error);
    return [];
  }

  return data || [];
}

// Get document by ID
export async function getDocumentById(
  id: string,
  ownerId: string
): Promise<ComplianceDocument | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('compliance_documents')
    .select(`
      *,
      company:companies!compliance_documents_company_id_fkey(id, name)
    `)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .single();

  if (error) {
    console.error('Error fetching document:', error);
    return null;
  }

  return data;
}

// Create document
export async function createDocument(
  ownerId: string,
  data: {
    company_id: string;
    partnership_id?: string;
    document_type: string;
    document_name: string;
    description?: string;
    file_url: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    effective_date?: string;
    expiration_date?: string;
    insurance_company?: string;
    policy_number?: string;
    coverage_amount?: number;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from('compliance_documents')
    .insert({
      owner_id: ownerId,
      company_id: data.company_id,
      partnership_id: data.partnership_id || null,
      document_type: data.document_type,
      document_name: data.document_name,
      description: data.description,
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size,
      file_type: data.file_type,
      effective_date: data.effective_date,
      expiration_date: data.expiration_date,
      insurance_company: data.insurance_company,
      policy_number: data.policy_number,
      coverage_amount: data.coverage_amount,
      status: 'pending_review',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating document:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: result.id };
}

// Update document status (approve/reject)
export async function updateDocumentStatus(
  id: string,
  ownerId: string,
  status: 'approved' | 'rejected',
  reviewNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('compliance_documents')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by_id: user?.id,
      review_notes: reviewNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', ownerId);

  if (error) {
    console.error('Error updating document status:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Upload new version of document (marks old as not current)
export async function uploadNewVersion(
  previousDocId: string,
  ownerId: string,
  data: {
    file_url: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    expiration_date?: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  // Get the previous document
  const { data: prevDoc, error: fetchError } = await supabase
    .from('compliance_documents')
    .select('*')
    .eq('id', previousDocId)
    .eq('owner_id', ownerId)
    .single();

  if (fetchError || !prevDoc) {
    return { success: false, error: 'Previous document not found' };
  }

  // Mark previous as not current
  await supabase
    .from('compliance_documents')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('id', previousDocId);

  // Create new version
  const { data: result, error } = await supabase
    .from('compliance_documents')
    .insert({
      owner_id: ownerId,
      company_id: prevDoc.company_id,
      partnership_id: prevDoc.partnership_id,
      document_type: prevDoc.document_type,
      document_name: prevDoc.document_name,
      description: prevDoc.description,
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size,
      file_type: data.file_type,
      effective_date: new Date().toISOString().split('T')[0],
      expiration_date: data.expiration_date || prevDoc.expiration_date,
      insurance_company: prevDoc.insurance_company,
      policy_number: prevDoc.policy_number,
      coverage_amount: prevDoc.coverage_amount,
      status: 'pending_review',
      version: (prevDoc.version || 1) + 1,
      previous_version_id: previousDocId,
      is_current: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating new version:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: result.id };
}

// Delete document
export async function deleteDocument(
  id: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('compliance_documents')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId);

  if (error) {
    console.error('Error deleting document:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get document counts by status for dashboard
export async function getDocumentCounts(ownerId: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  expiring: number;
  expired: number;
}> {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  const thirtyDaysOutStr = thirtyDaysOut.toISOString().split('T')[0];

  // Get all current documents
  const { data: docs } = await supabase
    .from('compliance_documents')
    .select('id, status, expiration_date')
    .eq('owner_id', ownerId)
    .eq('is_current', true);

  if (!docs) {
    return { total: 0, pending: 0, approved: 0, expiring: 0, expired: 0 };
  }

  const pending = docs.filter((d) => d.status === 'pending_review').length;
  const approved = docs.filter((d) => d.status === 'approved').length;
  const expired = docs.filter(
    (d) => d.expiration_date && d.expiration_date < today
  ).length;
  const expiring = docs.filter(
    (d) =>
      d.status === 'approved' &&
      d.expiration_date &&
      d.expiration_date >= today &&
      d.expiration_date <= thirtyDaysOutStr
  ).length;

  return {
    total: docs.length,
    pending,
    approved,
    expiring,
    expired,
  };
}

// Get companies for document upload dropdown
export async function getCompaniesForDocuments(ownerId: string): Promise<
  { id: string; name: string }[]
> {
  const supabase = await createClient();

  // Get owner's own companies
  const { data: ownCompanies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('owner_id', ownerId)
    .order('name');

  // Get partner companies
  const { data: partnerships } = await supabase
    .from('company_partnerships')
    .select(`
      company_a:companies!company_partnerships_company_a_id_fkey(id, name),
      company_b:companies!company_partnerships_company_b_id_fkey(id, name)
    `)
    .eq('owner_id', ownerId)
    .eq('status', 'active');

  const ownCompanyIds = new Set((ownCompanies || []).map((c) => c.id));
  const partnerCompanies: { id: string; name: string }[] = [];

  (partnerships as unknown as Array<{
    company_a: { id: string; name: string } | null;
    company_b: { id: string; name: string } | null
  }>)?.forEach((p) => {
    if (p.company_a && !ownCompanyIds.has(p.company_a.id)) {
      partnerCompanies.push(p.company_a);
    }
    if (p.company_b && !ownCompanyIds.has(p.company_b.id)) {
      partnerCompanies.push(p.company_b);
    }
  });

  // Combine and dedupe
  const allCompanies = [...(ownCompanies || []), ...partnerCompanies];
  const unique = allCompanies.filter(
    (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i
  );

  return unique.sort((a, b) => a.name.localeCompare(b.name));
}
