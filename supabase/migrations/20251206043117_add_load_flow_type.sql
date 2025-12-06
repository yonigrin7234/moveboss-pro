-- Add load_flow_type column to loads table
-- This is a new dimension (NOT a replacement) for existing type fields
-- It indicates how the load was created and affects wizard step visibility
--
-- Values:
--   'hhg_originated'      - Moving company created job for its own customer (shows all wizard steps)
--   'storage_out_rfd'     - RFD job from storage (skips Pickup step - origin is storage location)
--   'marketplace_purchase'- Carrier bought a load from the marketplace (skips Pickup step)
--   'carrier_intake'      - Carrier manually intakes a job from another company (skips Pickup step)
--
-- Note: NULL is valid for existing/legacy loads and shows all steps (backward compatible)

-- Create the enum type
CREATE TYPE load_flow_type AS ENUM (
  'hhg_originated',
  'storage_out_rfd',
  'marketplace_purchase',
  'carrier_intake'
);

-- Add the column to loads table (nullable for backward compatibility)
ALTER TABLE loads
ADD COLUMN load_flow_type load_flow_type;

-- Add a comment for documentation
COMMENT ON COLUMN loads.load_flow_type IS 'How the load was created. Controls wizard step visibility. NULL = legacy/show all steps.';

-- Create an index for potential filtering
CREATE INDEX idx_loads_load_flow_type ON loads(load_flow_type) WHERE load_flow_type IS NOT NULL;

