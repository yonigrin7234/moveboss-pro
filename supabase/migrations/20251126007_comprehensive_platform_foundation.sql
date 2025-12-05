-- =====================================================
-- COMPREHENSIVE DATABASE UPDATE - COMPLETE PLATFORM FOUNDATION
-- =====================================================
-- This migration adds support for:
-- 1. Organization types (Broker, Agent, Carrier, Hybrid)
-- 2. Multi-location storage facilities
-- 3. Customers table
-- 4. Load types (Standard, Van Line, Military, Corporate)
-- 5. Weight-based pricing and tracking
-- 6. Military/GBL documentation
-- 7. Company partnerships (two-way relationships)
-- 8. Partnership invitations
-- 9. Compliance documents (W-9, Hauling Agreements, Insurance)
-- 10. Corporate accounts
-- =====================================================

-- ===========================================
-- PART 1: UPDATE COMPANIES TABLE - ORGANIZATION TYPES
-- ===========================================

-- Organization type flags
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_broker BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_agent BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_carrier BOOLEAN DEFAULT false;
-- Carrier-specific fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS scac_code TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS carrier_type TEXT;
-- Agent-specific fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS has_warehouse BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS warehouse_capacity_cuft NUMERIC(12,2);
-- Company portal access
ALTER TABLE companies ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS portal_email TEXT;
-- Business details
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS years_in_business INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;
-- Insurance info (for carriers)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS insurance_company TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS insurance_expiration DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cargo_insurance_amount NUMERIC(12,2);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS liability_insurance_amount NUMERIC(12,2);
-- Compliance status
ALTER TABLE companies ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'incomplete';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS compliance_last_checked TIMESTAMPTZ;
-- Comments
COMMENT ON COLUMN companies.is_broker IS 'Books jobs, coordinates between agents and carriers';
COMMENT ON COLUMN companies.is_agent IS 'Does pickups, has warehouse/storage';
COMMENT ON COLUMN companies.is_carrier IS 'Hauls loads, has trucks and drivers';
COMMENT ON COLUMN companies.carrier_type IS 'van_line, flatbed, specialized, owner_operator';
COMMENT ON COLUMN companies.business_type IS 'llc, corporation, sole_proprietor, partnership';
-- ===========================================
-- PART 2: CREATE STORAGE LOCATIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES profiles(id),

  -- Location identification
  name TEXT NOT NULL,
  code TEXT,

  -- Type of storage
  location_type TEXT DEFAULT 'warehouse',

  -- Full address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT DEFAULT 'USA',

  -- Coordinates for mapping
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),

  -- Contact at this location
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- Access instructions
  access_hours TEXT,
  access_instructions TEXT,
  special_notes TEXT,
  gate_code TEXT,

  -- Capacity tracking
  total_capacity_cuft NUMERIC(12,2),
  current_usage_cuft NUMERIC(12,2) DEFAULT 0,

  -- For public storage / rental facilities
  monthly_rent NUMERIC(10,2),
  rent_due_day INTEGER,
  lease_start_date DATE,
  lease_end_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON COLUMN storage_locations.location_type IS 'warehouse, public_storage, partner_facility, container_yard, vault_storage, other';
-- Indexes
CREATE INDEX IF NOT EXISTS idx_storage_locations_company ON storage_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_storage_locations_owner ON storage_locations(owner_id);
CREATE INDEX IF NOT EXISTS idx_storage_locations_city_state ON storage_locations(city, state);
CREATE INDEX IF NOT EXISTS idx_storage_locations_active ON storage_locations(company_id) WHERE is_active = true;
-- ===========================================
-- PART 3: CREATE CUSTOMERS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  owner_id UUID REFERENCES profiles(id),

  -- Customer identification
  customer_number TEXT,

  -- Customer info
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  alternate_phone TEXT,

  -- Customer type
  customer_type TEXT DEFAULT 'residential',

  -- Origin address
  origin_address_line1 TEXT,
  origin_address_line2 TEXT,
  origin_city TEXT,
  origin_state TEXT,
  origin_zip TEXT,
  origin_country TEXT DEFAULT 'USA',

  -- Destination address
  destination_address_line1 TEXT,
  destination_address_line2 TEXT,
  destination_city TEXT,
  destination_state TEXT,
  destination_zip TEXT,
  destination_country TEXT DEFAULT 'USA',

  -- Military-specific
  military_branch TEXT,
  military_rank TEXT,
  military_member_name TEXT,
  military_id TEXT,

  -- Corporate-specific
  corporate_account_id UUID,
  corporate_company_name TEXT,
  corporate_employee_id TEXT,
  corporate_po_number TEXT,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON COLUMN customers.customer_type IS 'residential, commercial, military, corporate';
-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
-- ===========================================
-- PART 4: UPDATE LOADS TABLE - LOAD TYPE AND PRICING
-- ===========================================

-- Load type and pricing mode
ALTER TABLE loads ADD COLUMN IF NOT EXISTS load_type TEXT DEFAULT 'standard';
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pricing_mode TEXT DEFAULT 'cuft';
COMMENT ON COLUMN loads.load_type IS 'standard, van_line, military, corporate';
COMMENT ON COLUMN loads.pricing_mode IS 'cuft, weight, flat, hourly';
-- ===========================================
-- PART 5: UPDATE LOADS TABLE - STORAGE/PICKUP LOCATION
-- ===========================================

-- Link to storage location
ALTER TABLE loads ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES storage_locations(id);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS storage_unit TEXT;
-- Storage dates and charges
ALTER TABLE loads ADD COLUMN IF NOT EXISTS storage_in_date DATE;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS storage_out_date DATE;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS storage_days INTEGER;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS storage_rate_daily NUMERIC(10,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS storage_charges NUMERIC(12,2);
-- Pickup location details
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_address_line1 TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_address_line2 TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_contact_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_contact_phone TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_instructions TEXT;
-- Delivery location details
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_contact_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_contact_phone TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
-- ===========================================
-- PART 6: UPDATE LOADS TABLE - CUSTOMER LINK
-- ===========================================

-- Link to customer record
ALTER TABLE loads ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
-- Denormalized customer info
ALTER TABLE loads ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS customer_email TEXT;
-- ===========================================
-- PART 7: UPDATE LOADS TABLE - WEIGHT-BASED FIELDS
-- ===========================================

-- Estimated weight
ALTER TABLE loads ADD COLUMN IF NOT EXISTS estimated_weight_lbs NUMERIC(12,2);
-- Origin weight
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_tare_weight_lbs NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_gross_weight_lbs NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_net_weight_lbs NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_weight_ticket_photo TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_weight_date DATE;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_scale_name TEXT;
-- Destination weight
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dest_tare_weight_lbs NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dest_gross_weight_lbs NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dest_net_weight_lbs NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dest_weight_ticket_photo TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dest_weight_date DATE;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dest_scale_name TEXT;
-- Final/billed weight
ALTER TABLE loads ADD COLUMN IF NOT EXISTS billed_weight_lbs NUMERIC(12,2);
-- Weight-based pricing
ALTER TABLE loads ADD COLUMN IF NOT EXISTS rate_per_cwt NUMERIC(10,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS linehaul_charges NUMERIC(12,2);
-- Weight variance
ALTER TABLE loads ADD COLUMN IF NOT EXISTS weight_variance_lbs NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS weight_variance_acceptable BOOLEAN;
COMMENT ON COLUMN loads.rate_per_cwt IS 'Rate per hundredweight (CWT) - per 100 pounds';
-- ===========================================
-- PART 8: UPDATE LOADS TABLE - MILITARY/GBL FIELDS
-- ===========================================

-- GBL info
ALTER TABLE loads ADD COLUMN IF NOT EXISTS gbl_number TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS gbl_date DATE;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS gbl_photo TEXT;
-- TSP and SCAC
ALTER TABLE loads ADD COLUMN IF NOT EXISTS tsp_code TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS tsp_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS load_scac_code TEXT;
-- Military member info
ALTER TABLE loads ADD COLUMN IF NOT EXISTS military_branch TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS military_member_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS military_rank TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS military_member_id TEXT;
-- Authorization
ALTER TABLE loads ADD COLUMN IF NOT EXISTS authorization_number TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS authorization_date DATE;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS max_authorized_weight_lbs NUMERIC(12,2);
-- Military move type
ALTER TABLE loads ADD COLUMN IF NOT EXISTS military_move_type TEXT;
-- Military documents
ALTER TABLE loads ADD COLUMN IF NOT EXISTS military_documents JSONB DEFAULT '[]';
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dd_619_photo TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dd_619_signed BOOLEAN DEFAULT false;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dd_1840_photo TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS dd_1840_r_photo TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS member_signature_photo TEXT;
COMMENT ON COLUMN loads.military_move_type IS 'pcs, tdy, separation, retirement';
-- ===========================================
-- PART 9: UPDATE LOADS TABLE - CORPORATE FIELDS
-- ===========================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS corporate_account_id UUID;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS corporate_company_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS corporate_po_number TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS corporate_cost_center TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS corporate_employee_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS corporate_employee_id TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS corporate_authorization_code TEXT;
-- ===========================================
-- PART 10: UPDATE LOADS TABLE - ENHANCED ACCESSORIALS
-- ===========================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS packing_charges NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS unpacking_charges NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS crating_charges NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS uncrating_charges NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS appliance_service_charges NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS sit_charges NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS sit_days INTEGER;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS extra_pickup_charges NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS extra_delivery_charges NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS waiting_time_charges NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS reweigh_charges NUMERIC(12,2);
-- ===========================================
-- PART 11: UPDATE LOADS TABLE - CARRIER ASSIGNMENT
-- ===========================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS assigned_carrier_id UUID REFERENCES companies(id);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_assigned_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_accepted_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_declined_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_rate NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_rate_type TEXT;
-- ===========================================
-- PART 12: CREATE CORPORATE ACCOUNTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS corporate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id),

  -- Company info
  company_name TEXT NOT NULL,
  account_number TEXT,

  -- Billing contact
  billing_contact_name TEXT,
  billing_contact_email TEXT,
  billing_contact_phone TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,

  -- Terms
  payment_terms TEXT DEFAULT 'net_30',
  credit_limit NUMERIC(12,2),
  current_balance NUMERIC(12,2) DEFAULT 0,

  -- Negotiated rates
  negotiated_rate_per_cwt NUMERIC(10,2),
  negotiated_rate_per_cuft NUMERIC(10,2),
  discount_percentage NUMERIC(5,2),

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ===========================================
-- PART 13: CREATE COMPANY PARTNERSHIPS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS company_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The two parties
  company_a_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  company_b_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- Owner who manages this partnership (for data isolation)
  owner_id UUID REFERENCES profiles(id),

  -- Who initiated
  initiated_by_id UUID REFERENCES companies(id),

  -- Relationship type (from company_a's perspective)
  relationship_type TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' NOT NULL,

  -- Approval tracking
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  paused_reason TEXT,
  terminated_at TIMESTAMPTZ,
  terminated_reason TEXT,

  -- Negotiated terms
  default_rate_type TEXT,
  default_rate_amount NUMERIC(10,2),
  payment_terms TEXT DEFAULT 'net_30',

  -- Performance stats
  total_loads INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  last_load_at TIMESTAMPTZ,
  avg_rating NUMERIC(3,2),

  -- Notes
  internal_notes TEXT,

  -- Constraints
  CONSTRAINT unique_partnership UNIQUE(company_a_id, company_b_id),
  CONSTRAINT no_self_partnership CHECK (company_a_id != company_b_id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON COLUMN company_partnerships.relationship_type IS 'gives_loads, takes_loads, mutual';
COMMENT ON COLUMN company_partnerships.status IS 'pending, active, paused, terminated';
-- Indexes
CREATE INDEX IF NOT EXISTS idx_partnerships_company_a ON company_partnerships(company_a_id, status);
CREATE INDEX IF NOT EXISTS idx_partnerships_company_b ON company_partnerships(company_b_id, status);
CREATE INDEX IF NOT EXISTS idx_partnerships_active ON company_partnerships(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_partnerships_owner ON company_partnerships(owner_id);
-- ===========================================
-- PART 14: CREATE PARTNERSHIP INVITATIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS partnership_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who sent
  from_company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  from_owner_id UUID REFERENCES profiles(id),

  -- Who receives (either existing company or email invite)
  to_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  to_email TEXT,
  to_company_name TEXT,

  -- What type of relationship
  relationship_type TEXT NOT NULL,

  -- Invitation details
  message TEXT,

  -- Status
  status TEXT DEFAULT 'pending',

  -- Tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_message TEXT,

  -- Expiration
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- If accepted, link to created partnership
  partnership_id UUID REFERENCES company_partnerships(id),

  -- Invitation token (for email invites)
  invitation_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON COLUMN partnership_invitations.status IS 'pending, accepted, declined, expired, cancelled';
-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_to_company ON partnership_invitations(to_company_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_to_email ON partnership_invitations(to_email, status);
CREATE INDEX IF NOT EXISTS idx_invitations_from_company ON partnership_invitations(from_company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON partnership_invitations(invitation_token) WHERE invitation_token IS NOT NULL;
-- ===========================================
-- PART 15: CREATE COMPLIANCE DOCUMENTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who this document belongs to
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- In context of which partnership (optional - some docs are company-wide)
  partnership_id UUID REFERENCES company_partnerships(id) ON DELETE CASCADE,

  -- Owner who manages this
  owner_id UUID REFERENCES profiles(id),

  -- Document type
  document_type TEXT NOT NULL,

  -- Document details
  document_name TEXT NOT NULL,
  description TEXT,

  -- File storage
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,

  -- Validity period
  effective_date DATE,
  expiration_date DATE,

  -- Status
  status TEXT DEFAULT 'pending_review',

  -- Review tracking
  reviewed_at TIMESTAMPTZ,
  reviewed_by_id UUID REFERENCES profiles(id),
  review_notes TEXT,

  -- For insurance documents
  insurance_company TEXT,
  policy_number TEXT,
  coverage_amount NUMERIC(12,2),

  -- For signed agreements
  signed_by_name TEXT,
  signed_by_title TEXT,
  signed_at TIMESTAMPTZ,
  signature_photo TEXT,

  -- Alerts
  expiration_alert_sent BOOLEAN DEFAULT false,
  expiration_alert_sent_at TIMESTAMPTZ,

  -- Version tracking (for updated documents)
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES compliance_documents(id),
  is_current BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON COLUMN compliance_documents.document_type IS 'w9, hauling_agreement, insurance_certificate, mc_authority, dot_registration, cargo_insurance, liability_insurance, workers_comp, operating_authority, safety_rating, other';
COMMENT ON COLUMN compliance_documents.status IS 'pending_review, approved, rejected, expired';
-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_company ON compliance_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_partnership ON compliance_documents(partnership_id);
CREATE INDEX IF NOT EXISTS idx_compliance_type ON compliance_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_documents(status);
CREATE INDEX IF NOT EXISTS idx_compliance_expiration ON compliance_documents(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_current ON compliance_documents(company_id, document_type) WHERE is_current = true;
-- ===========================================
-- PART 16: CREATE COMPLIANCE REQUIREMENTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who set this requirement
  owner_id UUID REFERENCES profiles(id),

  -- Requirement scope
  scope TEXT NOT NULL,

  -- Document type required
  document_type TEXT NOT NULL,

  -- Requirement details
  name TEXT NOT NULL,
  description TEXT,

  -- Is this mandatory?
  is_required BOOLEAN DEFAULT true,

  -- Does it expire? How much notice before expiration?
  has_expiration BOOLEAN DEFAULT false,
  expiration_warning_days INTEGER DEFAULT 30,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON COLUMN compliance_requirements.scope IS 'carrier, agent, partnership, load_type_military, load_type_van_line';
-- Default requirements
INSERT INTO compliance_requirements (owner_id, scope, document_type, name, description, is_required, has_expiration, expiration_warning_days) VALUES
  (NULL, 'carrier', 'w9', 'W-9 Form', 'IRS Form W-9 for tax purposes', true, false, 0),
  (NULL, 'carrier', 'hauling_agreement', 'Hauling Agreement', 'Signed carrier hauling agreement', true, true, 365),
  (NULL, 'carrier', 'insurance_certificate', 'Certificate of Insurance', 'Current insurance certificate', true, true, 30),
  (NULL, 'carrier', 'mc_authority', 'MC Authority', 'Motor Carrier operating authority', true, true, 30),
  (NULL, 'carrier', 'cargo_insurance', 'Cargo Insurance', 'Cargo insurance coverage proof', true, true, 30),
  (NULL, 'agent', 'w9', 'W-9 Form', 'IRS Form W-9 for tax purposes', true, false, 0),
  (NULL, 'agent', 'hauling_agreement', 'Agent Agreement', 'Signed agent agreement', true, true, 365)
ON CONFLICT DO NOTHING;
-- ===========================================
-- PART 17: CREATE HELPER FUNCTIONS
-- ===========================================

-- Function to calculate net weight
CREATE OR REPLACE FUNCTION calculate_net_weight(gross NUMERIC, tare NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(gross, 0) - COALESCE(tare, 0);
END;
$$ LANGUAGE plpgsql;
-- Function to calculate linehaul
CREATE OR REPLACE FUNCTION calculate_linehaul(weight_lbs NUMERIC, rate_cwt NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND((COALESCE(weight_lbs, 0) / 100) * COALESCE(rate_cwt, 0), 2);
END;
$$ LANGUAGE plpgsql;
-- ===========================================
-- PART 18: CREATE TRIGGERS
-- ===========================================

-- Auto-calculate origin net weight
CREATE OR REPLACE FUNCTION trigger_origin_net_weight()
RETURNS TRIGGER AS $$
BEGIN
  NEW.origin_net_weight_lbs := calculate_net_weight(NEW.origin_gross_weight_lbs, NEW.origin_tare_weight_lbs);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_origin_net_weight ON loads;
CREATE TRIGGER trg_origin_net_weight
  BEFORE INSERT OR UPDATE OF origin_gross_weight_lbs, origin_tare_weight_lbs ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_origin_net_weight();
-- Auto-calculate destination net weight and variance
CREATE OR REPLACE FUNCTION trigger_dest_net_weight()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dest_net_weight_lbs := calculate_net_weight(NEW.dest_gross_weight_lbs, NEW.dest_tare_weight_lbs);
  NEW.weight_variance_lbs := COALESCE(NEW.origin_net_weight_lbs, 0) - COALESCE(NEW.dest_net_weight_lbs, 0);
  NEW.weight_variance_acceptable := ABS(COALESCE(NEW.weight_variance_lbs, 0)) <= (COALESCE(NEW.origin_net_weight_lbs, 1) * 0.05);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_dest_net_weight ON loads;
CREATE TRIGGER trg_dest_net_weight
  BEFORE INSERT OR UPDATE OF dest_gross_weight_lbs, dest_tare_weight_lbs ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_dest_net_weight();
-- Update partnership stats when load delivered
CREATE OR REPLACE FUNCTION trigger_update_partnership_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.load_status = 'delivered' AND (OLD IS NULL OR OLD.load_status != 'delivered') THEN
    UPDATE company_partnerships
    SET
      total_loads = total_loads + 1,
      total_revenue = total_revenue + COALESCE(NEW.total_revenue, 0),
      last_load_at = NOW(),
      updated_at = NOW()
    WHERE status = 'active'
    AND (
      (company_a_id = NEW.company_id AND company_b_id = NEW.assigned_carrier_id)
      OR (company_b_id = NEW.company_id AND company_a_id = NEW.assigned_carrier_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_update_partnership_stats ON loads;
CREATE TRIGGER trg_update_partnership_stats
  AFTER INSERT OR UPDATE OF load_status ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_partnership_stats();
-- ===========================================
-- PART 19: CREATE LOADS INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_loads_load_type ON loads(load_type);
CREATE INDEX IF NOT EXISTS idx_loads_pricing_mode ON loads(pricing_mode);
CREATE INDEX IF NOT EXISTS idx_loads_storage_location ON loads(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_loads_customer ON loads(customer_id);
CREATE INDEX IF NOT EXISTS idx_loads_assigned_carrier ON loads(assigned_carrier_id);
CREATE INDEX IF NOT EXISTS idx_loads_gbl_number ON loads(gbl_number) WHERE gbl_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loads_corporate_account ON loads(corporate_account_id) WHERE corporate_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loads_military ON loads(load_type) WHERE load_type = 'military';
-- ===========================================
-- PART 20: SET SAFE DEFAULTS FOR EXISTING DATA
-- ===========================================

-- Set existing companies as carriers
UPDATE companies
SET is_carrier = true
WHERE is_carrier IS NULL;
-- Set existing loads as standard type
UPDATE loads
SET load_type = 'standard', pricing_mode = 'cuft'
WHERE load_type IS NULL;
-- Set compliance status for existing companies
UPDATE companies
SET compliance_status = 'incomplete', compliance_last_checked = NOW()
WHERE compliance_status IS NULL;
-- ===========================================
-- PART 21: ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on new tables
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
-- Storage locations policies
CREATE POLICY "Users can view their storage locations" ON storage_locations
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert their storage locations" ON storage_locations
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their storage locations" ON storage_locations
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete their storage locations" ON storage_locations
  FOR DELETE USING (owner_id = auth.uid());
-- Customers policies
CREATE POLICY "Users can view their customers" ON customers
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert their customers" ON customers
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their customers" ON customers
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete their customers" ON customers
  FOR DELETE USING (owner_id = auth.uid());
-- Corporate accounts policies
CREATE POLICY "Users can view their corporate accounts" ON corporate_accounts
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert their corporate accounts" ON corporate_accounts
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their corporate accounts" ON corporate_accounts
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete their corporate accounts" ON corporate_accounts
  FOR DELETE USING (owner_id = auth.uid());
-- Partnerships policies
CREATE POLICY "Users can view their partnerships" ON company_partnerships
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert their partnerships" ON company_partnerships
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their partnerships" ON company_partnerships
  FOR UPDATE USING (owner_id = auth.uid());
-- Partnership invitations policies
CREATE POLICY "Users can view their invitations" ON partnership_invitations
  FOR SELECT USING (from_owner_id = auth.uid());
CREATE POLICY "Users can insert their invitations" ON partnership_invitations
  FOR INSERT WITH CHECK (from_owner_id = auth.uid());
CREATE POLICY "Users can update their invitations" ON partnership_invitations
  FOR UPDATE USING (from_owner_id = auth.uid());
-- Compliance documents policies
CREATE POLICY "Users can view their compliance docs" ON compliance_documents
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert their compliance docs" ON compliance_documents
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their compliance docs" ON compliance_documents
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete their compliance docs" ON compliance_documents
  FOR DELETE USING (owner_id = auth.uid());
-- Compliance requirements - everyone can read defaults
CREATE POLICY "Everyone can view compliance requirements" ON compliance_requirements
  FOR SELECT USING (true);
CREATE POLICY "Users can insert their requirements" ON compliance_requirements
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their requirements" ON compliance_requirements
  FOR UPDATE USING (owner_id = auth.uid() OR owner_id IS NULL);
