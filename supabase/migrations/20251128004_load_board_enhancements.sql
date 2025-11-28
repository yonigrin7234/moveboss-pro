-- Load Board Enhancements Migration
-- Adds: Tabs & Badges, Counter Offers, Request Dates, RFD Date Field

-- ============================================
-- LOADS TABLE ADDITIONS
-- ============================================

-- Add load_subtype for distinguishing live vs rfd loads
ALTER TABLE loads ADD COLUMN IF NOT EXISTS load_subtype TEXT;
-- Values: 'live' or 'rfd' for posting_type = 'load'

-- Add counter offer setting
ALTER TABLE loads ADD COLUMN IF NOT EXISTS is_open_to_counter BOOLEAN DEFAULT false;

-- Add RFD availability date (NULL = ready now)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS rfd_date DATE;

-- Update existing loads to have proper load_subtype based on load_type
UPDATE loads
SET load_subtype = CASE
  WHEN load_type = 'live_load' THEN 'live'
  WHEN load_type = 'rfd' THEN 'rfd'
  ELSE NULL
END
WHERE posting_type = 'load' AND load_subtype IS NULL;

-- ============================================
-- LOAD_REQUESTS TABLE ADDITIONS
-- ============================================

-- Request type: 'accept_listed' (accepts posted rate) or 'counter_offer'
ALTER TABLE load_requests ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'accept_listed';

-- Counter offer rate (per CF)
ALTER TABLE load_requests ADD COLUMN IF NOT EXISTS counter_offer_rate NUMERIC(10,4);

-- Proposed load/pickup dates
ALTER TABLE load_requests ADD COLUMN IF NOT EXISTS proposed_load_date_start DATE;
ALTER TABLE load_requests ADD COLUMN IF NOT EXISTS proposed_load_date_end DATE; -- NULL if specific date

-- Proposed delivery dates
ALTER TABLE load_requests ADD COLUMN IF NOT EXISTS proposed_delivery_date_start DATE;
ALTER TABLE load_requests ADD COLUMN IF NOT EXISTS proposed_delivery_date_end DATE; -- NULL if specific date

-- ============================================
-- INDEXES
-- ============================================

-- Index for filtering loads by posting_type and load_subtype
CREATE INDEX IF NOT EXISTS idx_loads_posting_type ON loads(posting_type);
CREATE INDEX IF NOT EXISTS idx_loads_load_subtype ON loads(load_subtype);
CREATE INDEX IF NOT EXISTS idx_loads_rfd_date ON loads(rfd_date);

-- Index for counter offer requests
CREATE INDEX IF NOT EXISTS idx_load_requests_request_type ON load_requests(request_type);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN loads.load_subtype IS 'For posting_type=load: live (immediate pickup) or rfd (ready for delivery from storage)';
COMMENT ON COLUMN loads.is_open_to_counter IS 'If true, carriers can propose a different rate per CF';
COMMENT ON COLUMN loads.rfd_date IS 'For RFD loads: date when freight is ready for pickup. NULL means ready now.';
COMMENT ON COLUMN load_requests.request_type IS 'accept_listed = accepts posted rate, counter_offer = proposes different rate';
COMMENT ON COLUMN load_requests.counter_offer_rate IS 'Carrier proposed rate per CF (only for counter_offer type)';
COMMENT ON COLUMN load_requests.proposed_load_date_start IS 'Earliest date carrier can load/pickup';
COMMENT ON COLUMN load_requests.proposed_load_date_end IS 'Latest date carrier can load (NULL = specific date only)';
COMMENT ON COLUMN load_requests.proposed_delivery_date_start IS 'Earliest estimated delivery date';
COMMENT ON COLUMN load_requests.proposed_delivery_date_end IS 'Latest estimated delivery date (NULL = specific date only)';
