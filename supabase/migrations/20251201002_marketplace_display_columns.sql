-- ============================================
-- MARKETPLACE DISPLAY COLUMNS
-- ============================================
-- These columns are used by the marketplace load board to display
-- origin/destination info in a consistent format.
-- They are separate from pickup_*/delivery_* columns which contain
-- full address details revealed only after load assignment.

-- Origin columns (shown on marketplace listing)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_city TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_state TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_zip TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_address TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_address2 TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_contact_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_contact_phone TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_contact_email TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_gate_code TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_notes TEXT;

-- Destination columns (shown on marketplace listing)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination_city TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination_state TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination_zip TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination_address TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination_address2 TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination_contact_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination_contact_phone TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination_contact_email TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination_gate_code TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS destination_notes TEXT;

-- Size estimate (for marketplace display)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS estimated_cuft INTEGER;

-- Load status for marketplace workflow
-- Values: pending, accepted, in_transit, delivered, cancelled
ALTER TABLE loads ADD COLUMN IF NOT EXISTS load_status TEXT DEFAULT 'pending';

-- ============================================
-- INDEXES FOR MARKETPLACE QUERIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_loads_origin_location ON loads(origin_state, origin_city);
CREATE INDEX IF NOT EXISTS idx_loads_destination_location ON loads(destination_state, destination_city);
CREATE INDEX IF NOT EXISTS idx_loads_load_status ON loads(load_status);
CREATE INDEX IF NOT EXISTS idx_loads_marketplace_query ON loads(is_marketplace_visible, load_status, posted_to_marketplace_at DESC)
  WHERE is_marketplace_visible = true;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN loads.origin_city IS 'City for marketplace display (pickup location)';
COMMENT ON COLUMN loads.origin_state IS 'State for marketplace display (pickup location)';
COMMENT ON COLUMN loads.origin_zip IS 'ZIP for marketplace display (pickup location)';
COMMENT ON COLUMN loads.destination_city IS 'City for marketplace display (delivery location)';
COMMENT ON COLUMN loads.destination_state IS 'State for marketplace display (delivery location)';
COMMENT ON COLUMN loads.destination_zip IS 'ZIP for marketplace display (delivery location)';
COMMENT ON COLUMN loads.estimated_cuft IS 'Estimated cubic feet for marketplace display';
COMMENT ON COLUMN loads.load_status IS 'Status for marketplace workflow: pending, accepted, in_transit, delivered, cancelled';
