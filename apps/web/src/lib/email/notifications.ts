import { sendEmail } from './client';
import { emailConfig } from './config';
import { loadStatusEmail, LoadStatusEmailData } from './templates/load-status';
import { complianceAlertEmail, ComplianceAlertEmailData } from './templates/compliance';
import { marketplaceEmail, MarketplaceEmailData } from './templates/marketplace';
import { driverAssignmentEmail, DriverAssignmentEmailData } from './templates/driver-assignment';
import {
  partnershipInvitationEmail,
  PartnershipInvitationEmailData,
} from './templates/partnership-invitation';
import { createClient } from '@/lib/supabase-server';

// Get user email preferences
async function getUserEmailPreferences(userId: string): Promise<Record<string, boolean>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  return {
    load_status_updates: data?.load_status_updates ?? true,
    compliance_alerts: data?.compliance_alerts ?? true,
    marketplace_activity: data?.marketplace_activity ?? true,
    driver_assignments: data?.driver_assignments ?? true,
    daily_digest: data?.daily_digest ?? false,
    weekly_digest: data?.weekly_digest ?? false,
  };
}

// Get user email by ID
async function getUserEmail(userId: string): Promise<{ email: string; name: string } | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (!profile?.email) return null;

  return {
    email: profile.email,
    name: profile.full_name || 'User',
  };
}

// ============================================
// LOAD STATUS NOTIFICATIONS
// ============================================

export async function sendLoadStatusEmail(
  data: Omit<LoadStatusEmailData, 'recipientName'> & { recipientUserId: string }
): Promise<void> {
  if (!emailConfig.enabled.loadStatusUpdates) return;

  // Check user preferences
  const prefs = await getUserEmailPreferences(data.recipientUserId);
  if (!prefs.load_status_updates) return;

  const user = await getUserEmail(data.recipientUserId);
  if (!user) return;

  const html = loadStatusEmail({
    ...data,
    recipientName: user.name,
  });

  await sendEmail({
    to: user.email,
    subject: `Load ${data.loadNumber}: ${data.status.replace('_', ' ').toUpperCase()}`,
    html,
  });
}

export async function notifyLoadStatusChange(
  loadId: string,
  newStatus: LoadStatusEmailData['status'],
  notes?: string
): Promise<void> {
  if (!emailConfig.enabled.loadStatusUpdates) return;

  const supabase = await createClient();

  const { data: load } = await supabase
    .from('loads')
    .select(
      `
      load_number,
      origin_city, origin_state,
      destination_city, destination_state,
      assigned_driver_name, assigned_driver_phone,
      company:companies!loads_company_id_fkey(id, name, owner_id),
      carrier:companies!loads_assigned_carrier_id_fkey(id, name, owner_id)
    `
    )
    .eq('id', loadId)
    .single();

  if (!load) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Handle joined data which can be arrays
  const companyRaw = load.company;
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;
  const carrierRaw = load.carrier;
  const carrier = Array.isArray(carrierRaw) ? carrierRaw[0] : carrierRaw;

  // Notify company owner
  if (company?.owner_id) {
    await sendLoadStatusEmail({
      recipientUserId: company.owner_id,
      loadNumber: load.load_number,
      status: newStatus,
      carrierName: carrier?.name,
      origin: `${load.origin_city}, ${load.origin_state}`,
      destination: `${load.destination_city}, ${load.destination_state}`,
      driverName: load.assigned_driver_name,
      driverPhone: load.assigned_driver_phone,
      timestamp: new Date().toISOString(),
      notes,
      viewUrl: `${baseUrl}/company/loads/${loadId}`,
    });
  }
}

// ============================================
// COMPLIANCE NOTIFICATIONS
// ============================================

export async function sendComplianceAlertEmail(
  data: Omit<ComplianceAlertEmailData, 'recipientName'> & { recipientUserId: string }
): Promise<void> {
  if (!emailConfig.enabled.complianceAlerts) return;

  // Check user preferences
  const prefs = await getUserEmailPreferences(data.recipientUserId);
  if (!prefs.compliance_alerts) return;

  const user = await getUserEmail(data.recipientUserId);
  if (!user) return;

  const html = complianceAlertEmail({
    ...data,
    recipientName: user.name,
  });

  const subjectMap = {
    expiring: `Compliance Alert: ${data.documentType} Expiring Soon`,
    expired: `Compliance Alert: ${data.documentType} Expired`,
    uploaded: `Compliance: ${data.documentType} Uploaded - Review Required`,
    approved: `Compliance: ${data.documentType} Approved`,
    rejected: `Compliance: ${data.documentType} Rejected`,
    requested: `Compliance Documents Requested`,
  };

  await sendEmail({
    to: user.email,
    subject: subjectMap[data.alertType],
    html,
  });
}

export async function notifyComplianceExpiring(
  ownerId: string,
  itemName: string,
  documentType: string,
  daysUntilExpiry: number
): Promise<void> {
  if (!emailConfig.enabled.complianceAlerts) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await sendComplianceAlertEmail({
    recipientUserId: ownerId,
    alertType: daysUntilExpiry <= 0 ? 'expired' : 'expiring',
    itemName,
    documentType,
    daysUntilExpiry,
    viewUrl: `${baseUrl}/dashboard/compliance/alerts`,
  });
}

export async function notifyComplianceDocUploaded(
  companyOwnerId: string,
  carrierName: string,
  documentType: string,
  partnershipId: string
): Promise<void> {
  if (!emailConfig.enabled.complianceAlerts) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await sendComplianceAlertEmail({
    recipientUserId: companyOwnerId,
    alertType: 'uploaded',
    itemName: carrierName,
    documentType,
    companyName: carrierName,
    viewUrl: `${baseUrl}/company/carriers/${partnershipId}/compliance`,
  });
}

export async function notifyComplianceDocApproved(
  carrierOwnerId: string,
  documentType: string
): Promise<void> {
  if (!emailConfig.enabled.complianceAlerts) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await sendComplianceAlertEmail({
    recipientUserId: carrierOwnerId,
    alertType: 'approved',
    itemName: documentType,
    documentType,
    viewUrl: `${baseUrl}/dashboard/compliance`,
  });
}

export async function notifyComplianceDocRejected(
  carrierOwnerId: string,
  documentType: string,
  rejectionReason: string
): Promise<void> {
  if (!emailConfig.enabled.complianceAlerts) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await sendComplianceAlertEmail({
    recipientUserId: carrierOwnerId,
    alertType: 'rejected',
    itemName: documentType,
    documentType,
    rejectionReason,
    viewUrl: `${baseUrl}/dashboard/compliance`,
  });
}

// ============================================
// MARKETPLACE NOTIFICATIONS
// ============================================

export async function sendMarketplaceEmail(
  data: Omit<MarketplaceEmailData, 'recipientName'> & { recipientUserId: string }
): Promise<void> {
  if (!emailConfig.enabled.marketplaceActivity) return;

  // Check user preferences
  const prefs = await getUserEmailPreferences(data.recipientUserId);
  if (!prefs.marketplace_activity) return;

  const user = await getUserEmail(data.recipientUserId);
  if (!user) return;

  const html = marketplaceEmail({
    ...data,
    recipientName: user.name,
  });

  const subjectMap = {
    new_request: `New Request for Load ${data.loadNumber}`,
    request_accepted: `Load Request Accepted: ${data.loadNumber}`,
    request_declined: `Load Request Declined: ${data.loadNumber}`,
    load_assigned: `Load Assigned: ${data.loadNumber}`,
    load_canceled: `Load Canceled: ${data.loadNumber}`,
  };

  await sendEmail({
    to: user.email,
    subject: subjectMap[data.eventType],
    html,
  });
}

export async function notifyNewLoadRequest(loadId: string, carrierId: string): Promise<void> {
  if (!emailConfig.enabled.marketplaceActivity) return;

  const supabase = await createClient();

  const { data: load } = await supabase
    .from('loads')
    .select(
      `
      load_number,
      origin_city, origin_state,
      destination_city, destination_state,
      carrier_rate, estimated_cuft, expected_load_date,
      company:companies!loads_company_id_fkey(owner_id)
    `
    )
    .eq('id', loadId)
    .single();

  const { data: carrier } = await supabase
    .from('companies')
    .select('name')
    .eq('id', carrierId)
    .single();

  if (!load) return;

  // Handle joined data which can be arrays
  const companyRaw = load.company;
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;

  if (!company?.owner_id) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await sendMarketplaceEmail({
    recipientUserId: company.owner_id,
    eventType: 'new_request',
    loadNumber: load.load_number,
    origin: `${load.origin_city}, ${load.origin_state}`,
    destination: `${load.destination_city}, ${load.destination_state}`,
    carrierName: carrier?.name,
    rate: load.carrier_rate,
    cuft: load.estimated_cuft,
    pickupDate: load.expected_load_date,
    viewUrl: `${baseUrl}/company/loads/${loadId}/requests`,
  });
}

export async function notifyRequestAccepted(loadId: string, carrierOwnerId: string): Promise<void> {
  if (!emailConfig.enabled.marketplaceActivity) return;

  const supabase = await createClient();

  const { data: load } = await supabase
    .from('loads')
    .select(
      `
      load_number,
      origin_city, origin_state,
      destination_city, destination_state,
      carrier_rate, estimated_cuft, expected_load_date,
      company:companies!loads_company_id_fkey(name)
    `
    )
    .eq('id', loadId)
    .single();

  if (!load) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Handle joined data which can be arrays
  const companyRaw = load.company;
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;

  await sendMarketplaceEmail({
    recipientUserId: carrierOwnerId,
    eventType: 'request_accepted',
    loadNumber: load.load_number,
    origin: `${load.origin_city}, ${load.origin_state}`,
    destination: `${load.destination_city}, ${load.destination_state}`,
    companyName: company?.name,
    rate: load.carrier_rate,
    cuft: load.estimated_cuft,
    pickupDate: load.expected_load_date,
    viewUrl: `${baseUrl}/dashboard/assigned-loads/${loadId}`,
  });
}

export async function notifyRequestDeclined(
  loadId: string,
  carrierOwnerId: string,
  reason?: string
): Promise<void> {
  if (!emailConfig.enabled.marketplaceActivity) return;

  const supabase = await createClient();

  const { data: load } = await supabase
    .from('loads')
    .select(
      `
      load_number,
      origin_city, origin_state,
      destination_city, destination_state,
      company:companies!loads_company_id_fkey(name)
    `
    )
    .eq('id', loadId)
    .single();

  if (!load) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Handle joined data which can be arrays
  const companyRaw = load.company;
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;

  await sendMarketplaceEmail({
    recipientUserId: carrierOwnerId,
    eventType: 'request_declined',
    loadNumber: load.load_number,
    origin: `${load.origin_city}, ${load.origin_state}`,
    destination: `${load.destination_city}, ${load.destination_state}`,
    companyName: company?.name,
    declineReason: reason,
    viewUrl: `${baseUrl}/dashboard/load-board`,
  });
}

// ============================================
// DRIVER ASSIGNMENT NOTIFICATIONS
// ============================================

export async function notifyDriverAssigned(loadId: string, driverId: string): Promise<void> {
  if (!emailConfig.enabled.driverAssignments) return;

  const supabase = await createClient();

  const { data: load } = await supabase
    .from('loads')
    .select(
      `
      load_number,
      origin_city, origin_state,
      destination_city, destination_state,
      expected_load_date,
      company:companies!loads_company_id_fkey(owner_id, name)
    `
    )
    .eq('id', loadId)
    .single();

  const { data: driver } = await supabase
    .from('drivers')
    .select('first_name, last_name, phone')
    .eq('id', driverId)
    .single();

  if (!load || !driver) return;

  // Handle joined data which can be arrays
  const companyRaw = load.company;
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;

  if (!company?.owner_id) return;

  // Check user preferences
  const prefs = await getUserEmailPreferences(company.owner_id);
  if (!prefs.driver_assignments) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const user = await getUserEmail(company.owner_id);
  if (!user) return;

  const html = driverAssignmentEmail({
    recipientName: user.name,
    driverName: `${driver.first_name} ${driver.last_name}`,
    driverPhone: driver.phone,
    loadNumber: load.load_number,
    origin: `${load.origin_city}, ${load.origin_state}`,
    destination: `${load.destination_city}, ${load.destination_state}`,
    pickupDate: load.expected_load_date,
    viewUrl: `${baseUrl}/company/loads/${loadId}`,
  });

  await sendEmail({
    to: user.email,
    subject: `Driver Assigned: ${driver.first_name} ${driver.last_name} for Load ${load.load_number}`,
    html,
  });
}

// ============================================
// PARTNERSHIP INVITATION NOTIFICATIONS
// ============================================

export async function sendPartnershipInvitationEmail(data: {
  toEmail: string;
  toCompanyName?: string;
  fromCompanyId: string;
  fromOwnerId: string;
  relationshipType: string;
  message?: string;
  invitationToken: string;
}): Promise<{ success: boolean; error?: string }> {
  console.log('[Partnership Email] Starting to send invitation email to:', data.toEmail);

  if (!emailConfig.enabled.partnershipInvitations) {
    console.log('[Partnership Email] Partnership invitations disabled in config');
    return { success: true };
  }

  const supabase = await createClient();

  // Get sender's info
  const { data: sender } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', data.fromOwnerId)
    .single();

  const { data: fromCompany } = await supabase
    .from('companies')
    .select('name')
    .eq('id', data.fromCompanyId)
    .single();

  if (!fromCompany) {
    console.log('[Partnership Email] Sender company not found:', data.fromCompanyId);
    return { success: false, error: 'Sender company not found' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const acceptUrl = `${baseUrl}/invitation/${data.invitationToken}`;

  console.log('[Partnership Email] Sending email with acceptUrl:', acceptUrl);

  const html = partnershipInvitationEmail({
    recipientEmail: data.toEmail,
    recipientCompanyName: data.toCompanyName,
    senderName: sender?.full_name || 'A user',
    senderCompanyName: fromCompany.name,
    relationshipType: data.relationshipType,
    message: data.message,
    acceptUrl,
  });

  const result = await sendEmail({
    to: data.toEmail,
    subject: `${fromCompany.name} has invited you to partner on MoveBoss Pro`,
    html,
  });

  console.log('[Partnership Email] Send result:', result);
  return result;
}
