-- ============================================
-- COMPLIANCE DOCUMENT TYPES
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_document_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  expiration_days INTEGER, -- NULL = never expires
  sort_order INTEGER DEFAULT 0
);
INSERT INTO compliance_document_types (id, name, description, is_required, expiration_days, sort_order) VALUES
  ('w9', 'W-9 Form', 'IRS tax form for independent contractors', true, NULL, 1),
  ('insurance_certificate', 'Certificate of Insurance', 'Proof of cargo and liability insurance', true, 365, 2),
  ('hauling_agreement', 'Hauling Agreement', 'Carrier agreement and terms', true, NULL, 3),
  ('mc_authority', 'MC Authority', 'Motor Carrier operating authority', false, NULL, 4),
  ('dot_registration', 'DOT Registration', 'Department of Transportation registration', false, NULL, 5)
ON CONFLICT (id) DO NOTHING;
-- ============================================
-- COMPLIANCE REQUESTS TABLE
-- ============================================
-- When company accepts new carrier, requests are created

CREATE TABLE IF NOT EXISTS compliance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The partnership this belongs to
  partnership_id UUID REFERENCES company_partnerships(id) ON DELETE CASCADE NOT NULL,

  -- Who is requesting (the company)
  requesting_company_id UUID REFERENCES companies(id) NOT NULL,
  requesting_user_id UUID REFERENCES profiles(id),

  -- Who needs to provide (the carrier)
  carrier_id UUID REFERENCES companies(id) NOT NULL,

  -- What document
  document_type_id TEXT REFERENCES compliance_document_types(id) NOT NULL,

  -- Status: pending, uploaded, approved, rejected, expired
  status TEXT DEFAULT 'pending',

  -- If uploaded, link to the document
  document_id UUID REFERENCES compliance_documents(id),

  -- Rejection reason if rejected
  rejection_reason TEXT,

  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_id UUID REFERENCES profiles(id),
  due_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One request per document type per partnership
  UNIQUE(partnership_id, document_type_id)
);
CREATE INDEX IF NOT EXISTS idx_compliance_requests_partnership ON compliance_requests(partnership_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requests_carrier ON compliance_requests(carrier_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requests_status ON compliance_requests(status);
-- ============================================
-- UPDATE COMPLIANCE DOCUMENTS TABLE
-- ============================================
-- Add fields if they don't exist

ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES compliance_requests(id);
ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS partnership_id UUID REFERENCES company_partnerships(id);
ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS uploaded_by_id UUID REFERENCES profiles(id);
ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
-- ============================================
-- UPDATE PARTNERSHIP STATUS BASED ON COMPLIANCE
-- ============================================

ALTER TABLE company_partnerships ADD COLUMN IF NOT EXISTS compliance_complete BOOLEAN DEFAULT false;
ALTER TABLE company_partnerships ADD COLUMN IF NOT EXISTS compliance_pending_count INTEGER DEFAULT 0;
-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE compliance_requests ENABLE ROW LEVEL SECURITY;
-- Companies can see requests they created
CREATE POLICY "Companies can view their compliance requests"
  ON compliance_requests FOR SELECT
  USING (
    requesting_company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );
-- Carriers can see requests for them
CREATE POLICY "Carriers can view their compliance requests"
  ON compliance_requests FOR SELECT
  USING (
    carrier_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );
-- Companies can insert requests
CREATE POLICY "Companies can create compliance requests"
  ON compliance_requests FOR INSERT
  WITH CHECK (
    requesting_company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );
-- Companies can update (approve/reject)
CREATE POLICY "Companies can update compliance requests"
  ON compliance_requests FOR UPDATE
  USING (
    requesting_company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );
-- Carriers can update (upload)
CREATE POLICY "Carriers can update their compliance requests"
  ON compliance_requests FOR UPDATE
  USING (
    carrier_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );
