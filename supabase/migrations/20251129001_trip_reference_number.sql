-- Add reference_number column to trips table
-- This allows owners to enter their own reference number alongside the auto-generated trip number

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS reference_number TEXT;
-- Add index for faster lookups by reference number
CREATE INDEX IF NOT EXISTS idx_trips_reference_number ON trips(owner_id, reference_number) WHERE reference_number IS NOT NULL;
-- Add comment explaining the column
COMMENT ON COLUMN trips.reference_number IS 'Optional owner-defined reference number for internal tracking';
