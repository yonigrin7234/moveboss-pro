import { createClient } from '@/lib/supabase-server';

export type AlertSeverity = 'warning' | 'urgent' | 'critical' | 'expired';

export interface ComplianceAlert {
  id: string;
  company_id: string;
  owner_id: string;
  alert_type: string;
  vehicle_id: string | null;
  driver_id: string | null;
  partnership_id: string | null;
  item_name: string;
  expiry_date: string | null;
  days_until_expiry: number | null;
  severity: AlertSeverity;
  is_resolved: boolean;
  created_at: string;
}

export interface ComplianceIssue {
  type: string;
  item: string;
  itemId: string;
  expiryDate: string | null;
  daysUntil: number | null;
  severity: AlertSeverity;
  message: string;
}

// Calculate severity based on days until expiry
export function getSeverity(daysUntil: number | null): AlertSeverity {
  if (daysUntil === null) return 'expired';
  if (daysUntil <= 0) return 'expired';
  if (daysUntil <= 7) return 'critical';
  if (daysUntil <= 14) return 'urgent';
  if (daysUntil <= 30) return 'warning';
  return 'warning';
}

// Calculate days until expiry
export function getDaysUntil(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Check vehicle compliance
export async function checkVehicleCompliance(vehicleId: string): Promise<ComplianceIssue[]> {
  const supabase = await createClient();
  const issues: ComplianceIssue[] = [];

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single();

  if (!vehicle) return issues;

  const vehicleName = `${vehicle.vehicle_type || 'Vehicle'} ${vehicle.unit_number || vehicle.plate_number || ''}`.trim();

  // Check registration
  if (vehicle.registration_expiry) {
    const days = getDaysUntil(vehicle.registration_expiry);
    if (days !== null && days <= 30) {
      issues.push({
        type: 'vehicle_registration',
        item: vehicleName,
        itemId: vehicleId,
        expiryDate: vehicle.registration_expiry,
        daysUntil: days,
        severity: getSeverity(days),
        message: days <= 0
          ? `Registration expired ${Math.abs(days)} days ago`
          : `Registration expires in ${days} days`,
      });
    }
  }

  // Check inspection
  if (vehicle.inspection_expiry) {
    const days = getDaysUntil(vehicle.inspection_expiry);
    if (days !== null && days <= 30) {
      issues.push({
        type: 'vehicle_inspection',
        item: vehicleName,
        itemId: vehicleId,
        expiryDate: vehicle.inspection_expiry,
        daysUntil: days,
        severity: getSeverity(days),
        message: days <= 0
          ? `Annual inspection expired ${Math.abs(days)} days ago`
          : `Annual inspection expires in ${days} days`,
      });
    }
  }

  // Check insurance
  if (vehicle.insurance_expiry) {
    const days = getDaysUntil(vehicle.insurance_expiry);
    if (days !== null && days <= 30) {
      issues.push({
        type: 'vehicle_insurance',
        item: vehicleName,
        itemId: vehicleId,
        expiryDate: vehicle.insurance_expiry,
        daysUntil: days,
        severity: getSeverity(days),
        message: days <= 0
          ? `Insurance expired ${Math.abs(days)} days ago`
          : `Insurance expires in ${days} days`,
      });
    }
  }

  // Check permit
  if (vehicle.permit_expiry) {
    const days = getDaysUntil(vehicle.permit_expiry);
    if (days !== null && days <= 30) {
      issues.push({
        type: 'vehicle_permit',
        item: vehicleName,
        itemId: vehicleId,
        expiryDate: vehicle.permit_expiry,
        daysUntil: days,
        severity: getSeverity(days),
        message: days <= 0
          ? `Permit expired ${Math.abs(days)} days ago`
          : `Permit expires in ${days} days`,
      });
    }
  }

  return issues;
}

// Check driver compliance
export async function checkDriverCompliance(driverId: string): Promise<ComplianceIssue[]> {
  const supabase = await createClient();
  const issues: ComplianceIssue[] = [];

  const { data: driver } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  if (!driver) return issues;

  const driverName = `${driver.first_name} ${driver.last_name}`;

  // Check license expiry
  if (driver.license_expiry) {
    const days = getDaysUntil(driver.license_expiry);
    if (days !== null && days <= 30) {
      issues.push({
        type: 'driver_license',
        item: driverName,
        itemId: driverId,
        expiryDate: driver.license_expiry,
        daysUntil: days,
        severity: getSeverity(days),
        message: days <= 0
          ? `License expired ${Math.abs(days)} days ago`
          : `License expires in ${days} days`,
      });
    }
  }

  // Check medical card
  if (driver.medical_card_expiry) {
    const days = getDaysUntil(driver.medical_card_expiry);
    if (days !== null && days <= 30) {
      issues.push({
        type: 'driver_medical_card',
        item: driverName,
        itemId: driverId,
        expiryDate: driver.medical_card_expiry,
        daysUntil: days,
        severity: getSeverity(days),
        message: days <= 0
          ? `Medical card expired ${Math.abs(days)} days ago`
          : `Medical card expires in ${days} days`,
      });
    }
  }

  // Check TWIC card
  if (driver.twic_card_expiry) {
    const days = getDaysUntil(driver.twic_card_expiry);
    if (days !== null && days <= 30) {
      issues.push({
        type: 'driver_twic',
        item: driverName,
        itemId: driverId,
        expiryDate: driver.twic_card_expiry,
        daysUntil: days,
        severity: getSeverity(days),
        message: days <= 0
          ? `TWIC card expired ${Math.abs(days)} days ago`
          : `TWIC card expires in ${days} days`,
      });
    }
  }

  return issues;
}

// Check partnership compliance (for a specific partnership)
export async function checkPartnershipCompliance(partnershipId: string): Promise<ComplianceIssue[]> {
  const supabase = await createClient();
  const issues: ComplianceIssue[] = [];

  // Get partnership with carrier info
  const { data: partnership } = await supabase
    .from('company_partnerships')
    .select(`
      *,
      carrier:companies!company_partnerships_company_b_id_fkey(id, name)
    `)
    .eq('id', partnershipId)
    .single();

  if (!partnership) return issues;

  const carrier = Array.isArray(partnership.carrier)
    ? partnership.carrier[0]
    : partnership.carrier;
  const carrierName = carrier?.name || 'Carrier';

  // Get compliance requests
  const { data: requests } = await supabase
    .from('compliance_requests')
    .select('*, document_type:compliance_document_types(*)')
    .eq('partnership_id', partnershipId);

  if (!requests) return issues;

  for (const request of requests) {
    // Check for missing/pending documents
    if (request.status === 'pending' || request.status === 'rejected') {
      issues.push({
        type: `partner_${request.document_type_id}`,
        item: carrierName,
        itemId: partnershipId,
        expiryDate: null,
        daysUntil: null,
        severity: 'urgent',
        message: `${request.document_type?.name || request.document_type_id} not on file`,
      });
    }

    // Check for expiring documents
    if (request.status === 'approved' && request.document_expiry_date) {
      const days = getDaysUntil(request.document_expiry_date);
      if (days !== null && days <= 30) {
        issues.push({
          type: `partner_${request.document_type_id}`,
          item: carrierName,
          itemId: partnershipId,
          expiryDate: request.document_expiry_date,
          daysUntil: days,
          severity: getSeverity(days),
          message: days <= 0
            ? `${request.document_type?.name} expired ${Math.abs(days)} days ago`
            : `${request.document_type?.name} expires in ${days} days`,
        });
      }
    }
  }

  return issues;
}

// Get all compliance alerts for a user
export async function getComplianceAlertsForUser(userId: string): Promise<ComplianceAlert[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('compliance_alerts')
    .select('*')
    .eq('owner_id', userId)
    .eq('is_resolved', false)
    .order('severity', { ascending: true })
    .order('days_until_expiry', { ascending: true });

  if (error) {
    console.error('Error fetching compliance alerts:', error);
    return [];
  }

  return data || [];
}

// Get compliance alert counts by severity for a user
export async function getComplianceAlertCounts(userId: string): Promise<Record<AlertSeverity, number>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('compliance_alerts')
    .select('severity')
    .eq('owner_id', userId)
    .eq('is_resolved', false);

  const counts: Record<AlertSeverity, number> = {
    warning: 0,
    urgent: 0,
    critical: 0,
    expired: 0,
  };

  data?.forEach(alert => {
    counts[alert.severity as AlertSeverity]++;
  });

  return counts;
}

// Check all vehicles and drivers for a user and generate alerts
export async function generateComplianceAlerts(userId: string, companyId?: string): Promise<void> {
  const supabase = await createClient();

  // Get all vehicles for the user
  const vehicleQuery = supabase.from('vehicles').select('id');
  if (companyId) {
    vehicleQuery.eq('company_id', companyId);
  } else {
    vehicleQuery.eq('owner_id', userId);
  }
  const { data: vehicles } = await vehicleQuery;

  // Get all drivers for the user
  const driverQuery = supabase.from('drivers').select('id');
  if (companyId) {
    driverQuery.eq('company_id', companyId);
  } else {
    driverQuery.eq('owner_id', userId);
  }
  const { data: drivers } = await driverQuery;

  // Get all partnerships where we are company_a (giving loads)
  const partnershipQuery = supabase.from('company_partnerships').select('id');
  if (companyId) {
    partnershipQuery.eq('company_a_id', companyId);
  }
  const { data: partnerships } = await partnershipQuery;

  const allIssues: { issue: ComplianceIssue; vehicleId?: string; driverId?: string; partnershipId?: string }[] = [];

  // Check vehicles
  for (const vehicle of vehicles || []) {
    const issues = await checkVehicleCompliance(vehicle.id);
    issues.forEach(issue => allIssues.push({ issue, vehicleId: vehicle.id }));
  }

  // Check drivers
  for (const driver of drivers || []) {
    const issues = await checkDriverCompliance(driver.id);
    issues.forEach(issue => allIssues.push({ issue, driverId: driver.id }));
  }

  // Check partnerships
  for (const partnership of partnerships || []) {
    const issues = await checkPartnershipCompliance(partnership.id);
    issues.forEach(issue => allIssues.push({ issue, partnershipId: partnership.id }));
  }

  // Mark existing alerts as resolved first (we'll recreate active ones)
  await supabase
    .from('compliance_alerts')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('owner_id', userId)
    .eq('is_resolved', false);

  // Insert new alerts
  for (const { issue, vehicleId, driverId, partnershipId } of allIssues) {
    await supabase
      .from('compliance_alerts')
      .insert({
        company_id: companyId || null,
        owner_id: userId,
        alert_type: issue.type,
        vehicle_id: vehicleId || null,
        driver_id: driverId || null,
        partnership_id: partnershipId || null,
        item_name: issue.item,
        expiry_date: issue.expiryDate,
        days_until_expiry: issue.daysUntil,
        severity: issue.severity,
        is_resolved: false,
      });
  }
}

// Check compliance before trip assignment
export async function checkTripAssignmentCompliance(
  vehicleId: string | null,
  driverId: string | null,
  blockExpired: boolean = false
): Promise<{ canProceed: boolean; issues: ComplianceIssue[] }> {
  const issues: ComplianceIssue[] = [];

  if (vehicleId) {
    const vehicleIssues = await checkVehicleCompliance(vehicleId);
    issues.push(...vehicleIssues);
  }

  if (driverId) {
    const driverIssues = await checkDriverCompliance(driverId);
    issues.push(...driverIssues);
  }

  const hasExpired = issues.some(i => i.severity === 'expired');
  const canProceed = blockExpired ? !hasExpired : true;

  return { canProceed, issues };
}

// Check compliance before accepting carrier
export async function checkCarrierCompliance(
  companyId: string,
  carrierId: string
): Promise<{ hasIssues: boolean; issues: ComplianceIssue[] }> {
  const supabase = await createClient();
  const issues: ComplianceIssue[] = [];

  // Check if partnership exists
  const { data: partnership } = await supabase
    .from('company_partnerships')
    .select('id')
    .or(`and(company_a_id.eq.${companyId},company_b_id.eq.${carrierId}),and(company_a_id.eq.${carrierId},company_b_id.eq.${companyId})`)
    .eq('status', 'active')
    .maybeSingle();

  if (partnership) {
    const partnershipIssues = await checkPartnershipCompliance(partnership.id);
    issues.push(...partnershipIssues);
  } else {
    // New carrier - no docs on file
    const { data: carrier } = await supabase
      .from('companies')
      .select('name')
      .eq('id', carrierId)
      .single();

    issues.push({
      type: 'partner_new',
      item: carrier?.name || 'Carrier',
      itemId: carrierId,
      expiryDate: null,
      daysUntil: null,
      severity: 'warning',
      message: 'New carrier - compliance documents will be requested',
    });
  }

  return { hasIssues: issues.length > 0, issues };
}

// Resolve an alert (when document is updated)
export async function resolveComplianceAlert(alertId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('compliance_alerts')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId);
}

// Resolve alerts for a specific item
export async function resolveAlertsForItem(
  type: 'vehicle' | 'driver' | 'partnership',
  itemId: string
): Promise<void> {
  const supabase = await createClient();

  const column = type === 'vehicle' ? 'vehicle_id' : type === 'driver' ? 'driver_id' : 'partnership_id';

  await supabase
    .from('compliance_alerts')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq(column, itemId)
    .eq('is_resolved', false);
}
