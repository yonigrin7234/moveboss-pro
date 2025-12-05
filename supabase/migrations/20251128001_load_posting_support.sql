-- Load Posting Support Migration
-- Adds columns needed for posting pickups and loads to the marketplace

BEGIN;
-- Remove existing constraint if it exists (allows re-running)
ALTER TABLE public.loads DROP CONSTRAINT IF EXISTS loads_load_type_check;
-- Add posting columns to loads table
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS balance_due NUMERIC(14,2);
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS pickup_date_start DATE;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS pickup_date_end DATE;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS current_storage_location TEXT;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS current_storage_location_id UUID REFERENCES storage_locations(id);
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS posted_by_company_id UUID REFERENCES companies(id);
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS posting_type TEXT;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS posting_status TEXT DEFAULT 'draft';
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS posting_expires_at TIMESTAMPTZ;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS assigned_carrier_id UUID REFERENCES companies(id);
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
-- Update load_type constraint to include new types
ALTER TABLE public.loads
  ADD CONSTRAINT loads_load_type_check
  CHECK (load_type IN ('pickup', 'live_load', 'rfd', 'company_load', 'local', 'long_distance', 'intrastate', 'interstate'));
-- Add posting type constraint
ALTER TABLE public.loads DROP CONSTRAINT IF EXISTS loads_posting_type_check;
ALTER TABLE public.loads
  ADD CONSTRAINT loads_posting_type_check
  CHECK (posting_type IS NULL OR posting_type IN ('pickup', 'load'));
-- Add posting status constraint
ALTER TABLE public.loads DROP CONSTRAINT IF EXISTS loads_posting_status_check;
ALTER TABLE public.loads
  ADD CONSTRAINT loads_posting_status_check
  CHECK (posting_status IS NULL OR posting_status IN ('draft', 'posted', 'assigned', 'in_progress', 'completed', 'cancelled'));
-- Create indexes for posting queries
CREATE INDEX IF NOT EXISTS idx_loads_posting_status ON public.loads(posting_status) WHERE posting_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loads_posted_by_company ON public.loads(posted_by_company_id) WHERE posted_by_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loads_assigned_carrier ON public.loads(assigned_carrier_id) WHERE assigned_carrier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loads_posting_type ON public.loads(posting_type) WHERE posting_type IS NOT NULL;
-- Add comment for documentation
COMMENT ON COLUMN public.loads.posting_type IS 'pickup = carrier does full job and collects balance; load = freight needing delivery';
COMMENT ON COLUMN public.loads.posting_status IS 'Workflow: draft -> posted -> assigned -> in_progress -> completed';
COMMENT ON COLUMN public.loads.balance_due IS 'Amount carrier collects from customer at delivery (for pickups)';
COMMIT;
