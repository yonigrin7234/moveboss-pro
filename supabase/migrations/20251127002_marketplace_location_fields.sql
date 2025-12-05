-- ============================================
-- MARKETPLACE LOCATION & AVAILABILITY FIELDS
-- ============================================
-- Extends load table with detailed pickup/delivery info

-- ============================================
-- PICKUP LOCATION DETAILS
-- ============================================
-- For one-time locations (not saved to storage_locations)

ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_location_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_address_line1 TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_address_line2 TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_city TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_state TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_zip TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_contact_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_contact_phone TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_gate_code TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_access_hours TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_instructions TEXT;
-- ============================================
-- DELIVERY LOCATION DETAILS
-- ============================================
-- Full address provided to carrier after assignment

ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_address_line1 TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_address_line2 TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_contact_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_contact_phone TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_gate_code TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
-- ============================================
-- AVAILABILITY
-- ============================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS is_ready_now BOOLEAN DEFAULT false;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS available_date DATE;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_urgency TEXT DEFAULT 'standard';
-- Values: flexible, standard, expedited

-- ============================================
-- EQUIPMENT REQUIREMENT
-- ============================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS equipment_type TEXT;
-- Values: NULL (any), 'box_truck', 'semi_trailer'

-- ============================================
-- ADDITIONAL FIELDS
-- ============================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS pieces_count INTEGER;
-- ============================================
-- LOAD REQUESTS - Add creates_partnership field
-- ============================================

ALTER TABLE load_requests ADD COLUMN IF NOT EXISTS creates_partnership BOOLEAN DEFAULT false;
-- ============================================
-- INDEXES FOR MARKETPLACE QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_loads_marketplace ON loads(is_marketplace_visible, load_status, posted_to_marketplace_at DESC)
  WHERE is_marketplace_visible = true;
CREATE INDEX IF NOT EXISTS idx_loads_origin ON loads(origin_state, origin_city);
CREATE INDEX IF NOT EXISTS idx_loads_destination ON loads(destination_state, destination_city);
CREATE INDEX IF NOT EXISTS idx_loads_equipment ON loads(equipment_type) WHERE equipment_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_load_requests_carrier_owner ON load_requests(carrier_owner_id);
-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN loads.equipment_type IS 'Required equipment: NULL (any), box_truck, semi_trailer';
COMMENT ON COLUMN loads.is_ready_now IS 'If true, load is available for immediate pickup';
COMMENT ON COLUMN loads.delivery_urgency IS 'Delivery timeline: flexible, standard, expedited';
COMMENT ON COLUMN load_requests.creates_partnership IS 'True if accepting this request creates a new partnership';
