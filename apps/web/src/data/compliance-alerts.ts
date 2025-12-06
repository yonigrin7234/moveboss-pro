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
  storage_location_id: string | null;
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
    .from('trucks')
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

// Check storage location payment compliance
export async function checkStoragePaymentCompliance(storageLocationId: string): Promise<ComplianceIssue[]> {
  const supabase = await createClient();
  const issues: ComplianceIssue[] = [];

  const { data: location } = await supabase
    .from('storage_locations')
    .select('*')
    .eq('id', storageLocationId)
    .single();

  if (!location || !location.track_payments || location.vacated_at) return issues;

  const locationName = location.unit_numbers
    ? `${location.name} (${location.unit_numbers})`
    : location.name;

  // Check next payment due
  if (location.next_payment_due) {
    const days = getDaysUntil(location.next_payment_due);
    const alertDays = location.alert_days_before || 7;

    if (days !== null && days <= alertDays) {
      issues.push({
        type: 'storage_payment',
        item: locationName,
        itemId: storageLocationId,
        expiryDate: location.next_payment_due,
        daysUntil: days,
        severity: getSeverity(days),
        message: days <= 0
          ? `Payment overdue by ${Math.abs(days)} days`
          : `Payment due in ${days} days`,
      });
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
  }

  // If we have alerts, return them
  if (data && data.length > 0) {
    return data;
  }

  // Otherwise, calculate directly from source tables
  return getComplianceAlertsDirect(userId);
}

// Get compliance alerts directly from drivers and vehicles (real-time)
export async function getComplianceAlertsDirect(userId: string): Promise<ComplianceAlert[]> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alerts: ComplianceAlert[] = [];

  // Helper to calculate days and severity
  const getDaysAndSeverity = (expiryDate: string | null): { days: number | null; severity: AlertSeverity } | null => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 0) return { days, severity: 'expired' };
    if (days <= 7) return { days, severity: 'critical' };
    if (days <= 14) return { days, severity: 'urgent' };
    if (days <= 30) return { days, severity: 'warning' };
    return null;
  };

  // Check drivers
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, license_expiry, medical_card_expiry, twic_card_expiry')
    .eq('owner_id', userId);

  for (const driver of drivers || []) {
    const driverName = `${driver.first_name} ${driver.last_name}`;

    // License
    const license = getDaysAndSeverity(driver.license_expiry);
    if (license) {
      alerts.push({
        id: `driver-license-${driver.id}`,
        company_id: '',
        owner_id: userId,
        alert_type: 'driver_license',
        vehicle_id: null,
        driver_id: driver.id,
        partnership_id: null,
        storage_location_id: null,
        item_name: `${driverName} - License`,
        expiry_date: driver.license_expiry,
        days_until_expiry: license.days,
        severity: license.severity,
        is_resolved: false,
        created_at: new Date().toISOString(),
      });
    }

    // Medical card
    const medical = getDaysAndSeverity(driver.medical_card_expiry);
    if (medical) {
      alerts.push({
        id: `driver-medical-${driver.id}`,
        company_id: '',
        owner_id: userId,
        alert_type: 'driver_medical_card',
        vehicle_id: null,
        driver_id: driver.id,
        partnership_id: null,
        storage_location_id: null,
        item_name: `${driverName} - Medical Card`,
        expiry_date: driver.medical_card_expiry,
        days_until_expiry: medical.days,
        severity: medical.severity,
        is_resolved: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Check trucks
  const { data: trucks } = await supabase
    .from('trucks')
    .select('id, unit_number, plate_number, vehicle_type, registration_expiry, inspection_expiry, insurance_expiry')
    .eq('owner_id', userId);

  for (const truck of trucks || []) {
    const truckName = truck.unit_number || truck.plate_number || 'Truck';

    // Registration
    const reg = getDaysAndSeverity(truck.registration_expiry);
    if (reg) {
      alerts.push({
        id: `truck-reg-${truck.id}`,
        company_id: '',
        owner_id: userId,
        alert_type: 'vehicle_registration',
        vehicle_id: truck.id,
        driver_id: null,
        partnership_id: null,
        storage_location_id: null,
        item_name: `${truckName} - Registration`,
        expiry_date: truck.registration_expiry,
        days_until_expiry: reg.days,
        severity: reg.severity,
        is_resolved: false,
        created_at: new Date().toISOString(),
      });
    }

    // Inspection
    const insp = getDaysAndSeverity(truck.inspection_expiry);
    if (insp) {
      alerts.push({
        id: `truck-insp-${truck.id}`,
        company_id: '',
        owner_id: userId,
        alert_type: 'vehicle_inspection',
        vehicle_id: truck.id,
        driver_id: null,
        partnership_id: null,
        storage_location_id: null,
        item_name: `${truckName} - Inspection`,
        expiry_date: truck.inspection_expiry,
        days_until_expiry: insp.days,
        severity: insp.severity,
        is_resolved: false,
        created_at: new Date().toISOString(),
      });
    }

    // Insurance
    const ins = getDaysAndSeverity(truck.insurance_expiry);
    if (ins) {
      alerts.push({
        id: `truck-ins-${truck.id}`,
        company_id: '',
        owner_id: userId,
        alert_type: 'vehicle_insurance',
        vehicle_id: truck.id,
        driver_id: null,
        partnership_id: null,
        storage_location_id: null,
        item_name: `${truckName} - Insurance`,
        expiry_date: truck.insurance_expiry,
        days_until_expiry: ins.days,
        severity: ins.severity,
        is_resolved: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Sort by severity (expired first) then by days
  const severityOrder: Record<AlertSeverity, number> = { expired: 0, critical: 1, urgent: 2, warning: 3 };
  alerts.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return (a.days_until_expiry ?? -999) - (b.days_until_expiry ?? -999);
  });

  return alerts;
}

// Get compliance alert counts by severity for a user
export async function getComplianceAlertCounts(userId: string): Promise<Record<AlertSeverity, number>> {
  const supabase = await createClient();

  // First try to get from alerts table
  const { data } = await supabase
    .from('compliance_alerts')
    .select('severity')
    .eq('owner_id', userId)
    .eq('is_resolved', false);

  // If we have alerts, use them
  if (data && data.length > 0) {
    const counts: Record<AlertSeverity, number> = {
      warning: 0,
      urgent: 0,
      critical: 0,
      expired: 0,
    };

    data.forEach(alert => {
      counts[alert.severity as AlertSeverity]++;
    });

    return counts;
  }

  // Otherwise, calculate directly from source tables (real-time check)
  return getComplianceCountsDirect(userId);
}

// Calculate compliance counts directly from drivers and vehicles (real-time)
export async function getComplianceCountsDirect(userId: string): Promise<Record<AlertSeverity, number>> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const counts: Record<AlertSeverity, number> = {
    warning: 0,
    urgent: 0,
    critical: 0,
    expired: 0,
  };

  // Helper to categorize by days until expiry
  const categorize = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0) return 'expired';
    if (daysUntil <= 7) return 'critical';
    if (daysUntil <= 14) return 'urgent';
    if (daysUntil <= 30) return 'warning';
    return null; // Not expiring soon
  };

  // Check drivers
  const { data: drivers } = await supabase
    .from('drivers')
    .select('license_expiry, medical_card_expiry, twic_card_expiry')
    .eq('owner_id', userId);

  for (const driver of drivers || []) {
    // License
    const licenseSeverity = categorize(driver.license_expiry);
    if (licenseSeverity) counts[licenseSeverity]++;

    // Medical card
    const medicalSeverity = categorize(driver.medical_card_expiry);
    if (medicalSeverity) counts[medicalSeverity]++;

    // TWIC card
    const twicSeverity = categorize(driver.twic_card_expiry);
    if (twicSeverity) counts[twicSeverity]++;
  }

  // Check trucks
  const { data: trucks } = await supabase
    .from('trucks')
    .select('registration_expiry, inspection_expiry, insurance_expiry, permit_expiry')
    .eq('owner_id', userId);

  for (const truck of trucks || []) {
    // Registration
    const regSeverity = categorize(truck.registration_expiry);
    if (regSeverity) counts[regSeverity]++;

    // Inspection
    const inspSeverity = categorize(truck.inspection_expiry);
    if (inspSeverity) counts[inspSeverity]++;

    // Insurance
    const insSeverity = categorize(truck.insurance_expiry);
    if (insSeverity) counts[insSeverity]++;

    // Permit
    const permitSeverity = categorize(truck.permit_expiry);
    if (permitSeverity) counts[permitSeverity]++;
  }

  // Check trailers too
  const { data: trailers } = await supabase
    .from('trailers')
    .select('registration_expiry, inspection_expiry')
    .eq('owner_id', userId);

  for (const trailer of trailers || []) {
    const regSeverity = categorize(trailer.registration_expiry);
    if (regSeverity) counts[regSeverity]++;

    const inspSeverity = categorize(trailer.inspection_expiry);
    if (inspSeverity) counts[inspSeverity]++;
  }

  return counts;
}

// Check all vehicles and drivers for a user and generate alerts
export async function generateComplianceAlerts(userId: string, companyId?: string): Promise<void> {
  const supabase = await createClient();

  // Get all trucks for the user
  const vehicleQuery = supabase.from('trucks').select('id');
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

  // Get all storage locations with payment tracking
  const { data: storageLocations } = await supabase
    .from('storage_locations')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_active', true)
    .eq('track_payments', true)
    .is('vacated_at', null);

  const allIssues: { issue: ComplianceIssue; vehicleId?: string; driverId?: string; partnershipId?: string; storageLocationId?: string }[] = [];

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

  // Check storage locations
  for (const storageLocation of storageLocations || []) {
    const issues = await checkStoragePaymentCompliance(storageLocation.id);
    issues.forEach(issue => allIssues.push({ issue, storageLocationId: storageLocation.id }));
  }

  // Mark existing alerts as resolved first (we'll recreate active ones)
  await supabase
    .from('compliance_alerts')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('owner_id', userId)
    .eq('is_resolved', false);

  // Insert new alerts
  for (const { issue, vehicleId, driverId, partnershipId, storageLocationId } of allIssues) {
    await supabase
      .from('compliance_alerts')
      .insert({
        company_id: companyId || null,
        owner_id: userId,
        alert_type: issue.type,
        vehicle_id: vehicleId || null,
        driver_id: driverId || null,
        partnership_id: partnershipId || null,
        storage_location_id: storageLocationId || null,
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
  type: 'vehicle' | 'driver' | 'partnership' | 'storage',
  itemId: string
): Promise<void> {
  const supabase = await createClient();

  const columnMap = {
    vehicle: 'vehicle_id',
    driver: 'driver_id',
    partnership: 'partnership_id',
    storage: 'storage_location_id',
  };
  const column = columnMap[type];

  await supabase
    .from('compliance_alerts')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq(column, itemId)
    .eq('is_resolved', false);
}
