-- ============================================
-- BACKFILL load_status FOR LEGACY LOADS
-- ============================================
-- Some loads created before the load_status column was added may have NULL values.
-- This migration sets them to 'pending' to ensure consistent behavior.

UPDATE loads
SET load_status = 'pending'
WHERE load_status IS NULL;

-- Also ensure the column has a proper default and NOT NULL constraint
ALTER TABLE loads
  ALTER COLUMN load_status SET DEFAULT 'pending',
  ALTER COLUMN load_status SET NOT NULL;

COMMENT ON COLUMN loads.load_status IS 'Driver workflow status: pending, accepted, loading, loaded, in_transit, delivered, storage_completed';
