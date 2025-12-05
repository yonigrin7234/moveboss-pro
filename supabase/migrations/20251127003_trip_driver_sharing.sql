-- ============================================
-- TRIP DRIVER SHARING SETTING
-- ============================================

-- Add privacy toggle to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS share_driver_with_companies BOOLEAN DEFAULT true;
-- Comment
COMMENT ON COLUMN trips.share_driver_with_companies IS 'If true, driver info is shared with companies on loads. If false, companies see "Contact carrier" instead.';
