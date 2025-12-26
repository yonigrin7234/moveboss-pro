-- Migration: Add arrived_at_delivery timestamp for driver workflow
-- Purpose: Track when driver arrives at delivery location (before payment collection)
-- This enables the "I've Arrived" confirmation step in the mobile app

-- Add arrived_at_delivery timestamp
ALTER TABLE loads ADD COLUMN IF NOT EXISTS arrived_at_delivery TIMESTAMPTZ;

-- Add index for querying loads by arrival status
CREATE INDEX IF NOT EXISTS idx_loads_arrived_at_delivery ON loads(arrived_at_delivery) WHERE arrived_at_delivery IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN loads.arrived_at_delivery IS 'Timestamp when driver confirms arrival at delivery location. Set before payment collection.';
