-- RFD (Ready For Delivery) Tracking Enhancements
-- This migration adds fields to track RFD dates and delivery deadlines

-- Add RFD tracking fields to loads table
-- Note: rfd_date already exists from migration 20251128004_load_board_enhancements.sql

-- Flag to indicate if RFD date is TBD (to be determined)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS rfd_date_tbd BOOLEAN DEFAULT false;

-- Number of days (or business days) from RFD to deliver
ALTER TABLE loads ADD COLUMN IF NOT EXISTS rfd_days_to_deliver INTEGER;

-- Whether to use business days (excluding weekends/holidays) for deadline calculation
ALTER TABLE loads ADD COLUMN IF NOT EXISTS rfd_use_business_days BOOLEAN DEFAULT true;

-- Calculated delivery deadline based on rfd_date + days_to_deliver
ALTER TABLE loads ADD COLUMN IF NOT EXISTS rfd_delivery_deadline DATE;

-- Add comments for documentation
COMMENT ON COLUMN loads.rfd_date_tbd IS 'True if RFD date is TBD (unknown). When true, rfd_date should be NULL';
COMMENT ON COLUMN loads.rfd_days_to_deliver IS 'Number of days (or business days) from RFD date to complete delivery';
COMMENT ON COLUMN loads.rfd_use_business_days IS 'If true, exclude weekends and US federal holidays when calculating deadline';
COMMENT ON COLUMN loads.rfd_delivery_deadline IS 'Calculated delivery deadline based on rfd_date + days_to_deliver';

-- Add indexes for efficient RFD queries
CREATE INDEX IF NOT EXISTS idx_loads_rfd_date_tbd ON loads(rfd_date_tbd) WHERE rfd_date_tbd = false;
CREATE INDEX IF NOT EXISTS idx_loads_rfd_delivery_deadline ON loads(rfd_delivery_deadline) WHERE rfd_delivery_deadline IS NOT NULL;

-- Composite index for finding unassigned loads with approaching RFD
CREATE INDEX IF NOT EXISTS idx_loads_unassigned_rfd ON loads(rfd_date, trip_id)
WHERE trip_id IS NULL AND rfd_date IS NOT NULL AND rfd_date_tbd = false;

-- Migrate existing data:
-- Loads with existing rfd_date should have rfd_date_tbd = false
UPDATE loads SET rfd_date_tbd = false WHERE rfd_date IS NOT NULL AND rfd_date_tbd IS NULL;

-- Loads without rfd_date default to tbd = true (created before this feature)
-- Note: We set this for legacy loads, new loads will require explicit selection
UPDATE loads SET rfd_date_tbd = true WHERE rfd_date IS NULL AND rfd_date_tbd IS NULL;

-- Set default business days preference for existing loads
UPDATE loads SET rfd_use_business_days = true WHERE rfd_use_business_days IS NULL;
