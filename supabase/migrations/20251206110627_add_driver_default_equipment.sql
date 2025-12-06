-- DRIVER DEFAULT EQUIPMENT
-- Add default_truck_id and default_trailer_id to drivers table.
-- These represent the driver's preferred equipment and are used to
-- auto-populate trip equipment when a driver is assigned to a trip.

-- Step 1: Add default equipment columns
ALTER TABLE drivers
ADD COLUMN default_truck_id UUID REFERENCES trucks(id) ON DELETE SET NULL,
ADD COLUMN default_trailer_id UUID REFERENCES trailers(id) ON DELETE SET NULL;

-- Step 2: Add comments explaining the columns
COMMENT ON COLUMN drivers.default_truck_id IS 'Preferred/default truck for this driver. Used to auto-populate trip equipment.';
COMMENT ON COLUMN drivers.default_trailer_id IS 'Preferred/default trailer for this driver. Only valid when default_truck is a tractor; should be NULL for box trucks.';

-- Step 3: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_default_truck_id ON drivers(default_truck_id) WHERE default_truck_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_default_trailer_id ON drivers(default_trailer_id) WHERE default_trailer_id IS NOT NULL;

-- Step 4: Sanity rule - ensure default_trailer_id is NULL when default_truck_id is NULL
-- This is enforced via a check constraint
ALTER TABLE drivers
ADD CONSTRAINT chk_driver_default_trailer_requires_truck
CHECK (default_truck_id IS NOT NULL OR default_trailer_id IS NULL);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Driver default equipment columns added successfully.';
END $$;

