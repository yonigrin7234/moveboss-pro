-- Remove job_number auto-generation
-- The job_number field was redundant with load_number (LD-000033 format)
-- Users can still enter an internal_reference when creating loads if they want a custom reference

BEGIN;

-- Remove the NOT NULL constraint and DEFAULT from job_number
-- This allows new loads to have NULL job_number (they'll use load_number instead)
ALTER TABLE loads ALTER COLUMN job_number DROP NOT NULL;
ALTER TABLE loads ALTER COLUMN job_number DROP DEFAULT;

-- Add comment explaining the change
COMMENT ON COLUMN loads.job_number IS 'Legacy field - no longer auto-generated. Use load_number as primary identifier and internal_reference for user-provided references.';

COMMIT;
