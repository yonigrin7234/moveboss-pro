import { createClient } from '@/lib/supabase-server';
import { logStructuredUploadEvent, createDocumentMetadata } from '@/lib/audit';

/**
 * Send a system message to the company-to-company conversation for a partnership
 * when compliance documents are uploaded.
 */
async function sendPartnershipDocumentMessage(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  partnershipId: string,
  ownerId: string,
  documentTypeLabel: string,
  isNewVersion: boolean = false
): Promise<void> {
  try {
    // Get the partnership to find both company IDs
    const { data: partnership, error: partnershipError } = await supabase
      .from('company_partnerships')
      .select('id, company_a_id, company_b_id')
      .eq('id', partnershipId)
      .single();

    if (partnershipError || !partnership) {
      console.error('[ComplianceDoc] Partnership not found:', partnershipError?.message);
      return;
    }

    // Get the owner's company to determine which side they're on
    const { data: ownerMembership } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('user_id', ownerId)
      .eq('is_primary', true)
      .maybeSingle();

    if (!ownerMembership?.company_id) {
      console.error('[ComplianceDoc] Owner company not found');
      return;
    }

    const ownerCompanyId = ownerMembership.company_id;
    const partnerCompanyId =
      ownerCompanyId === partnership.company_a_id
        ? partnership.company_b_id
        : partnership.company_a_id;

    // Find or create the company-to-company conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'company_to_company')
      .or(`and(owner_company_id.eq.${ownerCompanyId},partner_company_id.eq.${partnerCompanyId}),and(owner_company_id.eq.${partnerCompanyId},partner_company_id.eq.${ownerCompanyId})`)
      .maybeSingle();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Create the conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          type: 'company_to_company',
          owner_company_id: ownerCompanyId,
          partner_company_id: partnerCompanyId,
        })
        .select('id')
        .single();

      if (createError || !newConv) {
        console.error('[ComplianceDoc] Failed to create conversation:', createError?.message);
        return;
      }
      conversationId = newConv.id;
    }

    // Get the user's profile for the message
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', ownerId)
      .single();

    const performerName = profile?.full_name || profile?.email?.split('@')[0] || 'Someone';
    const messageBody = isNewVersion
      ? `${performerName} uploaded a new version of ${documentTypeLabel}`
      : `${performerName} uploaded ${documentTypeLabel}`;

    // Send the system message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_user_id: ownerId,
      sender_company_id: ownerCompanyId,
      body: messageBody,
      message_type: 'system',
      metadata: {
        upload_action: isNewVersion ? 'document_version_uploaded' : 'document_uploaded',
        document_type: documentTypeLabel,
        partnership_id: partnershipId,
      },
    });
  } catch (err) {
    console.error('[ComplianceDoc] Error sending partnership message:', err);
  }
}

// ===========================================
// UNIFIED COMPLIANCE ITEM TYPE
// ===========================================

export interface ComplianceItem {
  id: string;
  category: 'document' | 'driver' | 'truck' | 'trailer';
  type: string;
  name: string;
  description: string;
  expiration_date: string;
  days_until_expiration: number;
  status: 'expired' | 'expiring_soon' | 'valid';
  entity_id: string;
  entity_name: string;
  link: string;
}

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

  // Get company name for audit context
  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', data.company_id)
    .single();

  // Get document type label
  const docTypeLabel = DOCUMENT_TYPES.find((t) => t.value === data.document_type)?.label || data.document_type;

  // Log audit event (non-blocking)
  logStructuredUploadEvent(supabase, {
    entityType: 'company',
    entityId: data.company_id,
    action: 'document_uploaded',
    performedByUserId: ownerId,
    source: 'web',
    visibility: 'internal',
    metadata: createDocumentMetadata({
      documentType: docTypeLabel,
      status: 'pending_review',
      companyName: companyData?.name,
      expiresAt: data.expiration_date,
      fileUrl: data.file_url,
    }),
  }).catch(() => {}); // Swallow errors

  // Send partnership message if this document is tied to a partnership
  if (data.partnership_id) {
    sendPartnershipDocumentMessage(
      supabase,
      data.partnership_id,
      ownerId,
      docTypeLabel,
      false // not a new version
    ).catch(() => {}); // Non-blocking
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

  // Get company name for audit context
  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', prevDoc.company_id)
    .single();

  // Get document type label
  const docTypeLabel = DOCUMENT_TYPES.find((t) => t.value === prevDoc.document_type)?.label || prevDoc.document_type;

  // Log audit event for new version (non-blocking)
  logStructuredUploadEvent(supabase, {
    entityType: 'company',
    entityId: prevDoc.company_id,
    action: 'document_version_uploaded',
    performedByUserId: ownerId,
    source: 'web',
    visibility: 'internal',
    metadata: createDocumentMetadata({
      documentType: docTypeLabel,
      status: 'pending_review',
      versionNumber: (prevDoc.version || 1) + 1,
      companyName: companyData?.name,
      expiresAt: data.expiration_date || prevDoc.expiration_date,
      fileUrl: data.file_url,
    }),
  }).catch(() => {}); // Swallow errors

  // Send partnership message if this document is tied to a partnership
  if (prevDoc.partnership_id) {
    sendPartnershipDocumentMessage(
      supabase,
      prevDoc.partnership_id,
      ownerId,
      docTypeLabel,
      true // is a new version
    ).catch(() => {}); // Non-blocking
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

// ===========================================
// UNIFIED COMPLIANCE FUNCTIONS
// ===========================================

function calculateDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getComplianceStatus(daysUntil: number): 'expired' | 'expiring_soon' | 'valid' {
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 30) return 'expiring_soon';
  return 'valid';
}

// Get all expiring driver documents
export async function getDriverComplianceItems(ownerId: string): Promise<ComplianceItem[]> {
  const supabase = await createClient();

  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, license_expiry, medical_card_expiry, status')
    .eq('owner_id', ownerId)
    .in('status', ['active', 'suspended']);

  if (!drivers) return [];

  const items: ComplianceItem[] = [];

  for (const driver of drivers) {
    const driverName = `${driver.first_name} ${driver.last_name}`;

    if (driver.license_expiry) {
      const days = calculateDaysUntil(driver.license_expiry);
      items.push({
        id: `driver-license-${driver.id}`,
        category: 'driver',
        type: 'Driver License',
        name: `${driverName} - Driver License`,
        description: `CDL expires ${new Date(driver.license_expiry).toLocaleDateString()}`,
        expiration_date: driver.license_expiry,
        days_until_expiration: days,
        status: getComplianceStatus(days),
        entity_id: driver.id,
        entity_name: driverName,
        link: `/dashboard/people/drivers/${driver.id}`,
      });
    }

    if (driver.medical_card_expiry) {
      const days = calculateDaysUntil(driver.medical_card_expiry);
      items.push({
        id: `driver-medical-${driver.id}`,
        category: 'driver',
        type: 'Medical Card',
        name: `${driverName} - Medical Card`,
        description: `Medical card expires ${new Date(driver.medical_card_expiry).toLocaleDateString()}`,
        expiration_date: driver.medical_card_expiry,
        days_until_expiration: days,
        status: getComplianceStatus(days),
        entity_id: driver.id,
        entity_name: driverName,
        link: `/dashboard/people/drivers/${driver.id}`,
      });
    }
  }

  return items;
}

// Get all expiring truck documents
export async function getTruckComplianceItems(ownerId: string): Promise<ComplianceItem[]> {
  const supabase = await createClient();

  const { data: trucks } = await supabase
    .from('trucks')
    .select('id, unit_number, plate_number, make, model, year, registration_expiry, inspection_expiry, status')
    .eq('owner_id', ownerId)
    .in('status', ['active', 'maintenance']);

  if (!trucks) return [];

  const items: ComplianceItem[] = [];

  for (const truck of trucks) {
    const truckName = truck.unit_number || truck.plate_number || `${truck.year} ${truck.make} ${truck.model}`.trim() || 'Truck';

    if (truck.registration_expiry) {
      const days = calculateDaysUntil(truck.registration_expiry);
      items.push({
        id: `truck-registration-${truck.id}`,
        category: 'truck',
        type: 'Truck Registration',
        name: `${truckName} - Registration`,
        description: `Registration expires ${new Date(truck.registration_expiry).toLocaleDateString()}`,
        expiration_date: truck.registration_expiry,
        days_until_expiration: days,
        status: getComplianceStatus(days),
        entity_id: truck.id,
        entity_name: truckName,
        link: `/dashboard/fleet/trucks/${truck.id}`,
      });
    }

    if (truck.inspection_expiry) {
      const days = calculateDaysUntil(truck.inspection_expiry);
      items.push({
        id: `truck-inspection-${truck.id}`,
        category: 'truck',
        type: 'Truck Inspection',
        name: `${truckName} - Inspection`,
        description: `Inspection expires ${new Date(truck.inspection_expiry).toLocaleDateString()}`,
        expiration_date: truck.inspection_expiry,
        days_until_expiration: days,
        status: getComplianceStatus(days),
        entity_id: truck.id,
        entity_name: truckName,
        link: `/dashboard/fleet/trucks/${truck.id}`,
      });
    }
  }

  return items;
}

// Get all expiring trailer documents
export async function getTrailerComplianceItems(ownerId: string): Promise<ComplianceItem[]> {
  const supabase = await createClient();

  const { data: trailers } = await supabase
    .from('trailers')
    .select('id, unit_number, plate_number, make, model, year, registration_expiry, inspection_expiry, status')
    .eq('owner_id', ownerId)
    .in('status', ['active', 'maintenance']);

  if (!trailers) return [];

  const items: ComplianceItem[] = [];

  for (const trailer of trailers) {
    const trailerName = trailer.unit_number || trailer.plate_number || `${trailer.year} ${trailer.make} ${trailer.model}`.trim() || 'Trailer';

    if (trailer.registration_expiry) {
      const days = calculateDaysUntil(trailer.registration_expiry);
      items.push({
        id: `trailer-registration-${trailer.id}`,
        category: 'trailer',
        type: 'Trailer Registration',
        name: `${trailerName} - Registration`,
        description: `Registration expires ${new Date(trailer.registration_expiry).toLocaleDateString()}`,
        expiration_date: trailer.registration_expiry,
        days_until_expiration: days,
        status: getComplianceStatus(days),
        entity_id: trailer.id,
        entity_name: trailerName,
        link: `/dashboard/fleet/trailers/${trailer.id}`,
      });
    }

    if (trailer.inspection_expiry) {
      const days = calculateDaysUntil(trailer.inspection_expiry);
      items.push({
        id: `trailer-inspection-${trailer.id}`,
        category: 'trailer',
        type: 'Trailer Inspection',
        name: `${trailerName} - Inspection`,
        description: `Inspection expires ${new Date(trailer.inspection_expiry).toLocaleDateString()}`,
        expiration_date: trailer.inspection_expiry,
        days_until_expiration: days,
        status: getComplianceStatus(days),
        entity_id: trailer.id,
        entity_name: trailerName,
        link: `/dashboard/fleet/trailers/${trailer.id}`,
      });
    }
  }

  return items;
}

// Get document compliance items
export async function getDocumentComplianceItems(ownerId: string): Promise<ComplianceItem[]> {
  const supabase = await createClient();

  const { data: docs } = await supabase
    .from('compliance_documents')
    .select(`
      id, document_type, document_name, expiration_date, status,
      company:companies!compliance_documents_company_id_fkey(id, name)
    `)
    .eq('owner_id', ownerId)
    .eq('is_current', true)
    .eq('status', 'approved')
    .not('expiration_date', 'is', null);

  if (!docs) return [];

  const items: ComplianceItem[] = [];

  for (const doc of docs) {
    if (!doc.expiration_date) continue;

    const days = calculateDaysUntil(doc.expiration_date);
    const typeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type;
    const companyData = doc.company as unknown as { name: string } | null;
    const companyName = companyData?.name || 'Unknown';

    items.push({
      id: `document-${doc.id}`,
      category: 'document',
      type: typeLabel,
      name: doc.document_name,
      description: `${typeLabel} for ${companyName}`,
      expiration_date: doc.expiration_date,
      days_until_expiration: days,
      status: getComplianceStatus(days),
      entity_id: doc.id,
      entity_name: companyName,
      link: `/dashboard/compliance/${doc.id}`,
    });
  }

  return items;
}

// Get ALL compliance items across all categories
export async function getAllComplianceItems(ownerId: string): Promise<ComplianceItem[]> {
  const [driverItems, truckItems, trailerItems, documentItems] = await Promise.all([
    getDriverComplianceItems(ownerId),
    getTruckComplianceItems(ownerId),
    getTrailerComplianceItems(ownerId),
    getDocumentComplianceItems(ownerId),
  ]);

  return [...driverItems, ...truckItems, ...trailerItems, ...documentItems]
    .sort((a, b) => a.days_until_expiration - b.days_until_expiration);
}

// Get expiring and expired items (for alerts)
export async function getComplianceAlerts(ownerId: string): Promise<{
  expired: ComplianceItem[];
  expiringSoon: ComplianceItem[];
  counts: {
    total: number;
    expired: number;
    expiringSoon: number;
    byCategory: Record<string, { expired: number; expiringSoon: number }>;
  };
}> {
  const allItems = await getAllComplianceItems(ownerId);

  const expired = allItems.filter((item) => item.status === 'expired');
  const expiringSoon = allItems.filter((item) => item.status === 'expiring_soon');

  const byCategory: Record<string, { expired: number; expiringSoon: number }> = {
    driver: { expired: 0, expiringSoon: 0 },
    truck: { expired: 0, expiringSoon: 0 },
    trailer: { expired: 0, expiringSoon: 0 },
    document: { expired: 0, expiringSoon: 0 },
  };

  for (const item of expired) {
    byCategory[item.category].expired++;
  }
  for (const item of expiringSoon) {
    byCategory[item.category].expiringSoon++;
  }

  return {
    expired,
    expiringSoon,
    counts: {
      total: allItems.length,
      expired: expired.length,
      expiringSoon: expiringSoon.length,
      byCategory,
    },
  };
}
