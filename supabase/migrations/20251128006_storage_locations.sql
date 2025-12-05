-- Extend Storage Locations for warehouse vs public storage distinction
-- Add new fields to differentiate between warehouse and public storage facilities

-- Rename location_type to storage_type for clarity (if needed)
-- The existing location_type values: warehouse, public_storage, partner_facility, container_yard, vault_storage, other
-- We'll keep location_type but add new fields for warehouse/public storage specific data

-- Warehouse-specific fields
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS has_loading_dock BOOLEAN DEFAULT false;
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS dock_height TEXT;
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS appointment_required BOOLEAN DEFAULT false;
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS appointment_instructions TEXT;
-- Public Storage-specific fields
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS facility_brand TEXT;
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS facility_phone TEXT;
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS unit_numbers TEXT;
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS authorization_notes TEXT;
-- Truck Accessibility (both types)
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS truck_accessibility TEXT DEFAULT 'full';
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS accessibility_notes TEXT;
-- Add constraint for truck_accessibility if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'storage_locations_truck_accessibility_check'
  ) THEN
    ALTER TABLE storage_locations ADD CONSTRAINT storage_locations_truck_accessibility_check
      CHECK (truck_accessibility IS NULL OR truck_accessibility IN ('full', 'limited', 'none'));
  END IF;
END $$;
-- Note: existing gate_code field can serve as access_code for public storage
-- Note: existing access_hours field serves for both types
-- Note: existing access_instructions field can serve for notes
-- Note: existing special_notes field can serve for general notes

-- Add index for location_type filtering
CREATE INDEX IF NOT EXISTS idx_storage_locations_type ON storage_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_storage_locations_active ON storage_locations(owner_id, is_active);
