-- Add truck requirement to loads table
-- Values: 'any' (default), 'semi_only', 'box_truck_only'
-- This allows companies to specify what type of truck is needed for a load

ALTER TABLE loads ADD COLUMN IF NOT EXISTS truck_requirement TEXT DEFAULT 'any';

-- Add a check constraint to ensure valid values
ALTER TABLE loads ADD CONSTRAINT loads_truck_requirement_check
  CHECK (truck_requirement IN ('any', 'semi_only', 'box_truck_only'));

COMMENT ON COLUMN loads.truck_requirement IS 'Specifies the type of truck required for this load. Only applies to RFD and Live Load postings, not pickups.';
