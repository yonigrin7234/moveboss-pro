-- ============================================
-- COMPLIANCE ALERTS & EXPIRATION TRACKING
-- ============================================

-- ============================================
-- TRUCK COMPLIANCE FIELDS
-- Some fields already exist, add any missing ones
-- ============================================

ALTER TABLE trucks ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS registration_document_url TEXT;

ALTER TABLE trucks ADD COLUMN IF NOT EXISTS inspection_date DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS inspection_document_url TEXT;

ALTER TABLE trucks ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS insurance_document_url TEXT;

ALTER TABLE trucks ADD COLUMN IF NOT EXISTS permit_number TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS permit_expiry DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS permit_document_url TEXT;

-- ============================================
-- DRIVER COMPLIANCE FIELDS
-- drivers table uses license_number, license_state, license_expiry
-- Add CDL-specific and other compliance fields
-- ============================================

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cdl_class TEXT; -- A, B, C
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cdl_endorsements TEXT; -- H, N, P, S, T, X
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cdl_restrictions TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cdl_document_url TEXT;

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS medical_card_document_url TEXT;

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS mvr_date DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS mvr_document_url TEXT;

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS twic_card_number TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS twic_card_expiry DATE;

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS drug_test_date DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS drug_test_result TEXT; -- 'pass', 'fail', 'pending'
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS drug_test_document_url TEXT;

-- ============================================
-- COMPANY COMPLIANCE SETTINGS
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS block_expired_vehicles BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS block_expired_drivers BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_partner_compliance BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS compliance_warning_days INTEGER DEFAULT 30;

-- ============================================
-- COMPLIANCE ALERTS TABLE
-- Stores generated alerts for expiring/expired items
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who this alert is for
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES profiles(id) NOT NULL,

  -- What type of alert
  alert_type TEXT NOT NULL,
  -- truck_registration, truck_inspection, truck_insurance, truck_permit
  -- driver_license, driver_medical_card, driver_drug_test
  -- partner_insurance, partner_w9, partner_hauling_agreement

  -- Reference to the item
  vehicle_id UUID REFERENCES trucks(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  partnership_id UUID REFERENCES company_partnerships(id) ON DELETE CASCADE,

  -- Alert details
  item_name TEXT NOT NULL, -- "Truck #T-001" or "John Smith" or "Kangaroo Van Lines"
  expiry_date DATE,
  days_until_expiry INTEGER,

  -- Status
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'urgent', 'critical', 'expired')),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,

  -- Notification tracking
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index to prevent duplicate alerts (using COALESCE for nullable columns)
CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_alerts_unique
  ON compliance_alerts(company_id, alert_type, COALESCE(vehicle_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(driver_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(partnership_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE NOT is_resolved;

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_company ON compliance_alerts(company_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON compliance_alerts(severity, is_resolved);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_owner ON compliance_alerts(owner_id, is_resolved);

-- RLS
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company alerts" ON compliance_alerts;
CREATE POLICY "Users can view own company alerts"
  ON compliance_alerts FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own alerts" ON compliance_alerts;
CREATE POLICY "Users can manage own alerts"
  ON compliance_alerts FOR ALL
  USING (owner_id = auth.uid());

-- ============================================
-- ADD EXPIRATION TO COMPLIANCE REQUESTS
-- ============================================

ALTER TABLE compliance_requests ADD COLUMN IF NOT EXISTS document_expiry_date DATE;

-- Update expiration_days for existing document types
UPDATE compliance_document_types SET expiration_days = 365 WHERE id = 'insurance_certificate' AND expiration_days IS NULL;
