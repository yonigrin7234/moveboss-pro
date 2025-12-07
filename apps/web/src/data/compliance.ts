import { createServiceRoleClient } from '@/lib/supabase-admin';
import { createNotification } from './notifications';

// Use service role client for compliance operations to bypass RLS
// This is safe because the app logic already validates partnership ownership
function getComplianceClient() {
  return createServiceRoleClient();
}

export interface ComplianceRequest {
  id: string;
  partnership_id: string;
  requesting_company_id: string;
  carrier_id: string;
  document_type_id: string;
  status: 'pending' | 'uploaded' | 'approved' | 'rejected' | 'expired';
  document_id: string | null;
  rejection_reason: string | null;
  requested_at: string;
  uploaded_at: string | null;
  reviewed_at: string | null;
  due_date: string | null;
  document_type?: {
    id: string;
    name: string;
    description: string;
  };
  document?: {
    id: string;
    file_url: string;
    file_name: string;
  };
}

// Create compliance requests for a new partnership
export async function createComplianceRequestsForPartnership(
  partnershipId: string,
  requestingCompanyId: string,
  requestingUserId: string,
  carrierId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getComplianceClient();

  // Get required document types
  let { data: docTypes, error: docTypesError } = await supabase
    .from('compliance_document_types')
    .select('id, name')
    .eq('is_required', true)
    .order('sort_order');

  if (docTypesError) {
    console.error('Error fetching document types:', docTypesError);
    return { success: false, error: `Failed to fetch document types: ${docTypesError.message}` };
  }

  // If no document types exist, seed the default ones
  if (!docTypes || docTypes.length === 0) {
    console.log('No document types found, seeding defaults...');
    const defaultTypes = [
      { id: 'w9', name: 'W-9 Form', description: 'IRS tax form for independent contractors', is_required: true, expiration_days: null, sort_order: 1 },
      { id: 'insurance_certificate', name: 'Certificate of Insurance', description: 'Proof of cargo and liability insurance', is_required: true, expiration_days: 365, sort_order: 2 },
      { id: 'hauling_agreement', name: 'Hauling Agreement', description: 'Carrier agreement and terms', is_required: true, expiration_days: null, sort_order: 3 },
    ];

    const { error: seedError } = await supabase
      .from('compliance_document_types')
      .upsert(defaultTypes, { onConflict: 'id' });

    if (seedError) {
      console.error('Error seeding document types:', seedError);
      return { success: false, error: `Failed to seed document types: ${seedError.message}` };
    }

    // Refetch after seeding
    const refetch = await supabase
      .from('compliance_document_types')
      .select('id, name')
      .eq('is_required', true)
      .order('sort_order');

    docTypes = refetch.data;
  }

  if (!docTypes || docTypes.length === 0) {
    console.error('Still no document types after seeding');
    return { success: false, error: 'No required document types configured' };
  }

  console.log(`Creating ${docTypes.length} compliance requests for partnership ${partnershipId}`);

  // Calculate due date (14 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  // Create requests for each document type
  const requests = docTypes.map((dt) => ({
    partnership_id: partnershipId,
    requesting_company_id: requestingCompanyId,
    requesting_user_id: requestingUserId,
    carrier_id: carrierId,
    document_type_id: dt.id,
    status: 'pending',
    due_date: dueDate.toISOString().split('T')[0],
  }));

  const { error } = await supabase.from('compliance_requests').insert(requests);

  if (error) {
    console.error('Error creating compliance requests:', error);
    return { success: false, error: error.message };
  }

  // Update partnership pending count
  await supabase
    .from('company_partnerships')
    .update({
      compliance_pending_count: docTypes.length,
      compliance_complete: false,
    })
    .eq('id', partnershipId);

  // Get company name for notification
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', requestingCompanyId)
    .single();

  // Get carrier owner for notification
  const { data: carrier } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', carrierId)
    .single();

  // Notify carrier
  if (carrier?.owner_id) {
    await createNotification({
      user_id: carrier.owner_id,
      company_id: carrierId,
      type: 'compliance_docs_requested',
      title: `${company?.name || 'A company'} needs compliance documents`,
      message: `Please upload W-9, Insurance Certificate, and Hauling Agreement`,
      partnership_id: partnershipId,
    });
  }

  return { success: true };
}

// Get compliance requests for a partnership
export async function getComplianceRequestsForPartnership(
  partnershipId: string
): Promise<ComplianceRequest[]> {
  const supabase = getComplianceClient();

  // First get the base compliance requests
  const { data: requests, error } = await supabase
    .from('compliance_requests')
    .select('*')
    .eq('partnership_id', partnershipId)
    .order('document_type_id');

  if (error || !requests) {
    console.error('[Compliance] Error fetching requests:', error);
    return [];
  }

  // Then get document types and documents separately
  const docTypeIds = [...new Set(requests.map(r => r.document_type_id))];
  const docIds = requests.map(r => r.document_id).filter(Boolean);

  const [docTypesResult, docsResult] = await Promise.all([
    supabase.from('compliance_document_types').select('*').in('id', docTypeIds),
    docIds.length > 0
      ? supabase.from('compliance_documents').select('id, file_url, file_name').in('id', docIds)
      : Promise.resolve({ data: [] }),
  ]);

  const docTypesMap = new Map((docTypesResult.data || []).map(dt => [dt.id, dt]));
  const docsMap = new Map((docsResult.data || []).map(d => [d.id, d]));

  return requests.map((r) => ({
    ...r,
    document_type: docTypesMap.get(r.document_type_id) || null,
    document: r.document_id ? docsMap.get(r.document_id) || null : null,
  })) as ComplianceRequest[];
}

// Get compliance requests for a carrier (all partnerships)
export async function getComplianceRequestsForCarrier(carrierId: string): Promise<
  Array<
    ComplianceRequest & {
      requesting_company: { id: string; name: string } | null;
    }
  >
> {
  const supabase = getComplianceClient();

  // First get base compliance requests for this carrier
  const { data: requests, error } = await supabase
    .from('compliance_requests')
    .select('*')
    .eq('carrier_id', carrierId)
    .in('status', ['pending', 'rejected'])
    .order('due_date');

  if (error || !requests) {
    console.error('Error fetching carrier compliance requests:', error);
    return [];
  }

  if (requests.length === 0) {
    return [];
  }

  // Get related data separately
  const docTypeIds = [...new Set(requests.map(r => r.document_type_id))];
  const docIds = requests.map(r => r.document_id).filter(Boolean);
  const companyIds = [...new Set(requests.map(r => r.requesting_company_id))];

  const [docTypesResult, docsResult, companiesResult] = await Promise.all([
    supabase.from('compliance_document_types').select('*').in('id', docTypeIds),
    docIds.length > 0
      ? supabase.from('compliance_documents').select('id, file_url, file_name').in('id', docIds)
      : Promise.resolve({ data: [] }),
    supabase.from('companies').select('id, name').in('id', companyIds),
  ]);

  const docTypesMap = new Map((docTypesResult.data || []).map(dt => [dt.id, dt]));
  const docsMap = new Map((docsResult.data || []).map(d => [d.id, d]));
  const companiesMap = new Map((companiesResult.data || []).map(c => [c.id, c]));

  return requests.map((r) => ({
    ...r,
    document_type: docTypesMap.get(r.document_type_id) || null,
    document: r.document_id ? docsMap.get(r.document_id) || null : null,
    requesting_company: companiesMap.get(r.requesting_company_id) || null,
  })) as Array<
    ComplianceRequest & {
      requesting_company: { id: string; name: string } | null;
    }
  >;
}

// Get compliance requests for a user (across ALL their companies)
// This is needed because compliance requests may be linked to non-workspace companies
export async function getComplianceRequestsForUser(userId: string): Promise<
  Array<
    ComplianceRequest & {
      requesting_company: { id: string; name: string } | null;
    }
  >
> {
  const supabase = getComplianceClient();

  // First get all companies owned by this user
  const { data: userCompanies, error: companiesError } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', userId);

  if (companiesError || !userCompanies || userCompanies.length === 0) {
    console.error('Error fetching user companies:', companiesError);
    return [];
  }

  const companyIds = userCompanies.map(c => c.id);

  // Get compliance requests for ANY of the user's companies
  const { data: requests, error } = await supabase
    .from('compliance_requests')
    .select('*')
    .in('carrier_id', companyIds)
    .in('status', ['pending', 'rejected'])
    .order('due_date');

  if (error || !requests) {
    console.error('Error fetching user compliance requests:', error);
    return [];
  }

  if (requests.length === 0) {
    return [];
  }

  // Get related data separately
  const docTypeIds = [...new Set(requests.map(r => r.document_type_id))];
  const docIds = requests.map(r => r.document_id).filter(Boolean);
  const requestingCompanyIds = [...new Set(requests.map(r => r.requesting_company_id))];

  const [docTypesResult, docsResult, companiesResult] = await Promise.all([
    supabase.from('compliance_document_types').select('*').in('id', docTypeIds),
    docIds.length > 0
      ? supabase.from('compliance_documents').select('id, file_url, file_name').in('id', docIds)
      : Promise.resolve({ data: [] }),
    supabase.from('companies').select('id, name').in('id', requestingCompanyIds),
  ]);

  const docTypesMap = new Map((docTypesResult.data || []).map(dt => [dt.id, dt]));
  const docsMap = new Map((docsResult.data || []).map(d => [d.id, d]));
  const companiesMap = new Map((companiesResult.data || []).map(c => [c.id, c]));

  return requests.map((r) => ({
    ...r,
    document_type: docTypesMap.get(r.document_type_id) || null,
    document: r.document_id ? docsMap.get(r.document_id) || null : null,
    requesting_company: companiesMap.get(r.requesting_company_id) || null,
  })) as Array<
    ComplianceRequest & {
      requesting_company: { id: string; name: string } | null;
    }
  >;
}

// Get pending compliance count for carrier
export async function getPendingComplianceCount(carrierId: string): Promise<number> {
  const supabase = getComplianceClient();

  const { count, error } = await supabase
    .from('compliance_requests')
    .select('*', { count: 'exact', head: true })
    .eq('carrier_id', carrierId)
    .eq('status', 'pending');

  if (error) return 0;
  return count || 0;
}

// Upload compliance document
export async function uploadComplianceDocument(
  requestId: string,
  carrierId: string,
  uploadedById: string,
  fileUrl: string,
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getComplianceClient();

  // Get request details (without JOIN)
  const { data: request } = await supabase
    .from('compliance_requests')
    .select('*')
    .eq('id', requestId)
    .eq('carrier_id', carrierId)
    .single();

  if (!request) {
    return { success: false, error: 'Request not found' };
  }

  // Create compliance document record
  const { data: doc, error: docError } = await supabase
    .from('compliance_documents')
    .insert({
      company_id: carrierId,
      document_type: request.document_type_id,
      document_name: fileName,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      request_id: requestId,
      partnership_id: request.partnership_id,
      uploaded_by_id: uploadedById,
      status: 'pending_review',
    })
    .select('id')
    .single();

  if (docError) {
    console.error('Error creating document:', docError);
    return { success: false, error: docError.message };
  }

  // Update request
  const { error: updateError } = await supabase
    .from('compliance_requests')
    .update({
      status: 'uploaded',
      document_id: doc.id,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error updating request:', updateError);
    return { success: false, error: updateError.message };
  }

  // Get company data separately for notifications
  const [carrierResult, requestingCompanyResult] = await Promise.all([
    supabase.from('companies').select('name').eq('id', carrierId).single(),
    supabase.from('companies').select('id, name, owner_id').eq('id', request.requesting_company_id).single(),
  ]);

  const carrier = carrierResult.data;
  const requestingCompany = requestingCompanyResult.data;

  if (requestingCompany?.owner_id) {
    await createNotification({
      user_id: requestingCompany.owner_id,
      company_id: request.requesting_company_id,
      type: 'compliance_doc_uploaded',
      title: `${carrier?.name || 'Carrier'} uploaded ${request.document_type_id.replace('_', ' ')}`,
      message: 'Review and approve the document',
      partnership_id: request.partnership_id,
    });
  }

  return { success: true };
}

// Approve compliance document
export async function approveComplianceDocument(
  requestId: string,
  reviewerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getComplianceClient();

  // Get request details (without JOIN)
  const { data: request } = await supabase
    .from('compliance_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request) {
    return { success: false, error: 'Request not found' };
  }

  // Update request
  const { error } = await supabase
    .from('compliance_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by_id: reviewerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error approving document:', error);
    return { success: false, error: error.message };
  }

  // Update document status
  if (request.document_id) {
    await supabase
      .from('compliance_documents')
      .update({ status: 'approved' })
      .eq('id', request.document_id);
  }

  // Check if all docs approved for this partnership
  const { data: allRequests } = await supabase
    .from('compliance_requests')
    .select('status')
    .eq('partnership_id', request.partnership_id);

  const allApproved = allRequests?.every((r) => r.status === 'approved');
  const pendingCount =
    allRequests?.filter((r) => r.status === 'pending' || r.status === 'uploaded').length || 0;

  await supabase
    .from('company_partnerships')
    .update({
      compliance_complete: allApproved,
      compliance_pending_count: pendingCount,
    })
    .eq('id', request.partnership_id);

  // Get carrier data separately for notification
  const { data: carrier } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', request.carrier_id)
    .single();

  if (carrier?.owner_id) {
    await createNotification({
      user_id: carrier.owner_id,
      company_id: request.carrier_id,
      type: 'compliance_doc_approved',
      title: `${request.document_type_id.replace('_', ' ')} approved`,
      message: allApproved
        ? 'All compliance documents are now complete!'
        : 'Document has been approved',
      partnership_id: request.partnership_id,
    });
  }

  return { success: true };
}

// Reject compliance document
export async function rejectComplianceDocument(
  requestId: string,
  reviewerId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getComplianceClient();

  // Get request details (without JOIN)
  const { data: request } = await supabase
    .from('compliance_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request) {
    return { success: false, error: 'Request not found' };
  }

  // Update request back to pending with rejection reason
  const { error } = await supabase
    .from('compliance_requests')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by_id: reviewerId,
      document_id: null, // Clear document so they can upload again
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting document:', error);
    return { success: false, error: error.message };
  }

  // Get carrier data separately for notification
  const { data: carrier } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', request.carrier_id)
    .single();

  if (carrier?.owner_id) {
    await createNotification({
      user_id: carrier.owner_id,
      company_id: request.carrier_id,
      type: 'compliance_doc_rejected',
      title: `${request.document_type_id.replace('_', ' ')} was rejected`,
      message: `Reason: ${reason}. Please upload a new document.`,
      partnership_id: request.partnership_id,
    });
  }

  return { success: true };
}

// Get compliance request by ID
export async function getComplianceRequestById(requestId: string): Promise<
  | (ComplianceRequest & {
      requesting_company: { id: string; name: string } | null;
      carrier: { id: string; name: string; owner_id: string } | null;
    })
  | null
> {
  const supabase = getComplianceClient();

  // Get base request data
  const { data: request, error } = await supabase
    .from('compliance_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error || !request) {
    console.error('[getComplianceRequestById] Error fetching request:', error);
    return null;
  }

  // Get related data separately (avoiding JOINs which don't work reliably with service role)
  const [docTypeResult, docResult, requestingCompanyResult, carrierResult] = await Promise.all([
    supabase
      .from('compliance_document_types')
      .select('*')
      .eq('id', request.document_type_id)
      .single(),
    request.document_id
      ? supabase
          .from('compliance_documents')
          .select('id, file_url, file_name')
          .eq('id', request.document_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('companies')
      .select('id, name')
      .eq('id', request.requesting_company_id)
      .single(),
    supabase
      .from('companies')
      .select('id, name, owner_id')
      .eq('id', request.carrier_id)
      .single(),
  ]);

  return {
    ...request,
    document_type: docTypeResult.data || null,
    document: docResult.data || null,
    requesting_company: requestingCompanyResult.data || null,
    carrier: carrierResult.data || null,
  } as ComplianceRequest & {
    requesting_company: { id: string; name: string } | null;
    carrier: { id: string; name: string; owner_id: string } | null;
  };
}
