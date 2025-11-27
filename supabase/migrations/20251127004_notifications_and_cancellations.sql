-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  company_id UUID REFERENCES companies(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE,
  request_id UUID REFERENCES load_requests(id) ON DELETE CASCADE,
  partnership_id UUID REFERENCES company_partnerships(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- LOAD CANCELLATIONS TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS load_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE NOT NULL,
  load_number TEXT,

  -- Who canceled
  canceled_by_type TEXT NOT NULL, -- 'carrier' or 'company'
  canceled_by_company_id UUID REFERENCES companies(id),
  canceled_by_user_id UUID REFERENCES profiles(id),

  -- Who was affected
  affected_company_id UUID REFERENCES companies(id),

  -- Reason
  reason_code TEXT NOT NULL,
  -- Carrier reasons: schedule_conflict, equipment_issue, found_better_load, emergency, other
  -- Company reasons: customer_changed_dates, customer_canceled, load_unavailable,
  --                  carrier_not_responding, carrier_requested, found_different_carrier, other
  reason_details TEXT,

  -- Fault assignment (for stats)
  fault_party TEXT NOT NULL, -- 'carrier', 'company', 'customer', 'none'

  -- What stage was the load at
  load_stage TEXT, -- 'requested', 'accepted', 'confirmed'

  -- Timestamps
  canceled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancellations_carrier ON load_cancellations(canceled_by_company_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_affected ON load_cancellations(affected_company_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_load ON load_cancellations(load_id);

-- ============================================
-- RELIABILITY STATS ON COMPANIES
-- ============================================

-- Carrier stats (when they give loads back)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS loads_given_back INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS loads_accepted_total INTEGER DEFAULT 0;

-- Company stats (when they cancel carriers)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS loads_canceled_on_carriers INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS loads_assigned_total INTEGER DEFAULT 0;

-- ============================================
-- FUNCTIONS FOR INCREMENTING STATS
-- ============================================

-- Function to increment loads_given_back
CREATE OR REPLACE FUNCTION increment_loads_given_back(p_company_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE companies
  SET loads_given_back = COALESCE(loads_given_back, 0) + 1
  WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment loads_canceled_on_carriers
CREATE OR REPLACE FUNCTION increment_loads_canceled(p_company_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE companies
  SET loads_canceled_on_carriers = COALESCE(loads_canceled_on_carriers, 0) + 1
  WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment loads_accepted_total (call when carrier accepts load)
CREATE OR REPLACE FUNCTION increment_loads_accepted(p_company_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE companies
  SET loads_accepted_total = COALESCE(loads_accepted_total, 0) + 1
  WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment loads_assigned_total (call when company assigns carrier)
CREATE OR REPLACE FUNCTION increment_loads_assigned(p_company_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE companies
  SET loads_assigned_total = COALESCE(loads_assigned_total, 0) + 1
  WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE notifications IS 'User notifications for marketplace events';
COMMENT ON TABLE load_cancellations IS 'Tracks all load cancellations for reliability scoring';
COMMENT ON COLUMN load_cancellations.fault_party IS 'Who is at fault: carrier, company, customer (no fault), none';
COMMENT ON COLUMN companies.loads_given_back IS 'Count of loads carrier accepted then returned';
COMMENT ON COLUMN companies.loads_canceled_on_carriers IS 'Count of loads company canceled after assigning carrier';
