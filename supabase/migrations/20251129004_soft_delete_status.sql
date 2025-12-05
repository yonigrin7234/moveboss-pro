-- Soft Delete Status Migration
-- Adds 'archived' status option to drivers, trucks, and trailers
-- Implements soft delete pattern instead of hard deletes

BEGIN;
-- Update drivers status check constraint to include 'archived'
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_status_check;
ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_status_check
  CHECK (status IN ('active', 'inactive', 'suspended', 'archived'));
-- Update trucks status check constraint to include 'archived'
ALTER TABLE public.trucks DROP CONSTRAINT IF EXISTS trucks_status_check;
ALTER TABLE public.trucks
  ADD CONSTRAINT trucks_status_check
  CHECK (status IN ('active', 'maintenance', 'inactive', 'archived'));
-- Update trailers status check constraint to include 'archived'
ALTER TABLE public.trailers DROP CONSTRAINT IF EXISTS trailers_status_check;
ALTER TABLE public.trailers
  ADD CONSTRAINT trailers_status_check
  CHECK (status IN ('active', 'maintenance', 'inactive', 'archived'));
-- Add archived_at timestamp columns for audit trail
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.trailers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
-- Add indexes for status filtering (archived items are typically excluded)
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status) WHERE status != 'archived';
CREATE INDEX IF NOT EXISTS idx_trucks_status ON public.trucks(status) WHERE status != 'archived';
CREATE INDEX IF NOT EXISTS idx_trailers_status ON public.trailers(status) WHERE status != 'archived';
-- Comments for documentation
COMMENT ON COLUMN public.drivers.archived_at IS 'Timestamp when driver was archived (soft deleted)';
COMMENT ON COLUMN public.trucks.archived_at IS 'Timestamp when truck was archived (soft deleted)';
COMMENT ON COLUMN public.trailers.archived_at IS 'Timestamp when trailer was archived (soft deleted)';
COMMIT;
