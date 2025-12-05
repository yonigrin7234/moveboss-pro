-- Load Release Tracking Migration
-- Adds columns to track when carriers release loads back to marketplace
-- Also adds RPC function to increment carrier's loads_given_back counter

BEGIN;
-- Add release tracking columns to loads table
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS release_reason TEXT;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS released_by_carrier_id UUID REFERENCES companies(id);
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
-- Add index for released loads
CREATE INDEX IF NOT EXISTS idx_loads_released_by_carrier ON public.loads(released_by_carrier_id) WHERE released_by_carrier_id IS NOT NULL;
-- Ensure companies table has loads_given_back column
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS loads_given_back INTEGER DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS loads_accepted_total INTEGER DEFAULT 0;
-- RPC function to increment carrier's loads_given_back counter
CREATE OR REPLACE FUNCTION increment_carrier_loads_given_back(carrier_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE companies
  SET loads_given_back = COALESCE(loads_given_back, 0) + 1
  WHERE id = carrier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- RPC function to increment carrier's loads_accepted_total counter
CREATE OR REPLACE FUNCTION increment_carrier_loads_accepted(carrier_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE companies
  SET loads_accepted_total = COALESCE(loads_accepted_total, 0) + 1
  WHERE id = carrier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_carrier_loads_given_back(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_carrier_loads_accepted(UUID) TO authenticated;
-- Add comments for documentation
COMMENT ON COLUMN public.loads.release_reason IS 'Reason provided by carrier when releasing load back to marketplace';
COMMENT ON COLUMN public.loads.released_at IS 'Timestamp when load was released back to marketplace';
COMMENT ON COLUMN public.loads.released_by_carrier_id IS 'Carrier company that released the load';
COMMENT ON COLUMN public.loads.cancelled_at IS 'Timestamp when load was cancelled';
COMMENT ON COLUMN public.loads.cancellation_reason IS 'Reason provided when cancelling the load';
COMMENT ON COLUMN public.companies.loads_given_back IS 'Total number of loads this carrier has given back to marketplace';
COMMENT ON COLUMN public.companies.loads_accepted_total IS 'Total number of loads this carrier has accepted';
COMMIT;
