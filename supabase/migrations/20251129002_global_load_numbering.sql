-- Global Load Numbering Migration
-- Implements LD-000001 format with 6 digits, sequential across the entire platform
-- Also adds marketplace_listed boolean field

BEGIN;

-- Create a global sequence for load numbers (starts at 1)
CREATE SEQUENCE IF NOT EXISTS global_load_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  NO CYCLE;

-- Add marketplace_listed column to track if load is posted to marketplace
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS marketplace_listed BOOLEAN DEFAULT FALSE;

-- Create index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_loads_marketplace_listed ON public.loads(marketplace_listed) WHERE marketplace_listed = TRUE;

-- Function to generate the next load number in LD-000001 format
CREATE OR REPLACE FUNCTION generate_load_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'LD-' || LPAD(nextval('global_load_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate load_number if not provided
CREATE OR REPLACE FUNCTION set_load_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if load_number is null or empty
  IF NEW.load_number IS NULL OR NEW.load_number = '' THEN
    NEW.load_number := generate_load_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_set_load_number ON public.loads;
CREATE TRIGGER trigger_set_load_number
  BEFORE INSERT ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION set_load_number();

-- Add comments for documentation
COMMENT ON SEQUENCE global_load_number_seq IS 'Global sequence for generating unique load numbers across the platform';
COMMENT ON COLUMN public.loads.marketplace_listed IS 'Whether this load is currently listed on the marketplace';
COMMENT ON FUNCTION generate_load_number() IS 'Generates next load number in LD-000001 format';

COMMIT;
