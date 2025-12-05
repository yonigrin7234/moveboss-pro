-- ============================================
-- LOAD RATE FIELDS FOR MARKETPLACE
-- ============================================
-- Rates are per-load, not per-partnership
-- Companies can post fixed rates or open to offers

-- Company's posted rate
ALTER TABLE loads ADD COLUMN IF NOT EXISTS company_rate NUMERIC(10,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS company_rate_type TEXT DEFAULT 'per_cuft';
ALTER TABLE loads ADD COLUMN IF NOT EXISTS rate_is_fixed BOOLEAN DEFAULT false;
-- Carrier's final rate (after acceptance)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_rate NUMERIC(10,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_rate_type TEXT DEFAULT 'per_cuft';
-- Marketplace visibility
ALTER TABLE loads ADD COLUMN IF NOT EXISTS is_marketplace_visible BOOLEAN DEFAULT false;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS push_to_partners BOOLEAN DEFAULT false;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS posted_to_marketplace_at TIMESTAMPTZ;
-- Carrier confirmation
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_confirmed_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS expected_load_date DATE;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES drivers(id);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS assigned_driver_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS assigned_driver_phone TEXT;
-- ============================================
-- LOAD REQUESTS TABLE
-- ============================================
-- Carriers request loads from the marketplace

CREATE TABLE IF NOT EXISTS load_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The load being requested
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE NOT NULL,

  -- The carrier requesting
  carrier_id UUID REFERENCES companies(id) NOT NULL,
  carrier_owner_id UUID REFERENCES profiles(id),

  -- Is this carrier already a partner?
  is_partner BOOLEAN DEFAULT false,
  partnership_id UUID REFERENCES company_partnerships(id),

  -- Carrier's offered rate
  offered_rate NUMERIC(10,2),
  offered_rate_type TEXT DEFAULT 'per_cuft',

  -- Did carrier accept company's rate or counter?
  accepted_company_rate BOOLEAN DEFAULT false,

  -- Optional message
  message TEXT,

  -- Status: pending, accepted, declined, withdrawn, expired
  status TEXT DEFAULT 'pending',

  -- Company's response
  responded_at TIMESTAMPTZ,
  response_message TEXT,
  responded_by_id UUID REFERENCES profiles(id),

  -- Final agreed rate (set when accepted)
  final_rate NUMERIC(10,2),
  final_rate_type TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_load_requests_load ON load_requests(load_id);
CREATE INDEX IF NOT EXISTS idx_load_requests_carrier ON load_requests(carrier_id);
CREATE INDEX IF NOT EXISTS idx_load_requests_status ON load_requests(status);
-- RLS
ALTER TABLE load_requests ENABLE ROW LEVEL SECURITY;
-- Carriers can see their own requests
CREATE POLICY "Carriers can view own requests"
  ON load_requests FOR SELECT
  USING (carrier_owner_id = auth.uid());
-- Carriers can create requests
CREATE POLICY "Carriers can create requests"
  ON load_requests FOR INSERT
  WITH CHECK (carrier_owner_id = auth.uid());
-- Carriers can update own requests (withdraw)
CREATE POLICY "Carriers can update own requests"
  ON load_requests FOR UPDATE
  USING (carrier_owner_id = auth.uid());
-- Load owners can see requests on their loads
CREATE POLICY "Load owners can view requests"
  ON load_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loads
      WHERE loads.id = load_requests.load_id
      AND loads.owner_id = auth.uid()
    )
  );
-- Load owners can update requests (accept/decline)
CREATE POLICY "Load owners can update requests"
  ON load_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loads
      WHERE loads.id = load_requests.load_id
      AND loads.owner_id = auth.uid()
    )
  );
-- ============================================
-- NOTIFICATIONS TABLE (for future use)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who receives this
  user_id UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id),

  -- Notification type
  type TEXT NOT NULL,
  -- Types: new_load_posted, load_request_received, request_accepted,
  -- request_declined, load_confirmed, load_picked_up, load_delivered,
  -- compliance_doc_requested, compliance_doc_expiring

  -- Content
  title TEXT NOT NULL,
  message TEXT,

  -- Related entities
  load_id UUID REFERENCES loads(id),
  request_id UUID REFERENCES load_requests(id),
  partnership_id UUID REFERENCES company_partnerships(id),

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id, is_read, created_at DESC);
-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());
-- ============================================
-- PLATFORM STATS ON COMPANIES (for trust/reputation)
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS platform_loads_completed INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS platform_on_time_rate NUMERIC(5,2);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS platform_rating NUMERIC(3,2);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS platform_member_since DATE;
-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN loads.rate_is_fixed IS 'If true, carriers must accept company rate. If false, carriers can counter-offer.';
COMMENT ON COLUMN loads.company_rate IS 'Rate the company is offering/willing to pay';
COMMENT ON COLUMN loads.carrier_rate IS 'Final agreed rate the carrier will be paid';
COMMENT ON COLUMN load_requests.accepted_company_rate IS 'True if carrier accepted company rate without counter';
COMMENT ON COLUMN load_requests.final_rate IS 'The agreed rate, set when request is accepted';
