-- Migration: Marketplace Load to Trip Assignment Integration
-- This enables loads from the marketplace to be tracked and assigned to trips

-- Add marketplace integration fields to loads table
ALTER TABLE loads ADD COLUMN IF NOT EXISTS marketplace_request_id UUID REFERENCES load_requests(id);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS is_from_marketplace BOOLEAN DEFAULT false;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS source_company_id UUID REFERENCES companies(id);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS source_company_name TEXT;

-- Add operational status tracking for marketplace visibility
ALTER TABLE loads ADD COLUMN IF NOT EXISTS operational_status TEXT DEFAULT 'unassigned';
-- Values: 'unassigned', 'assigned_to_driver', 'en_route_to_pickup', 'at_pickup',
--         'loading', 'loaded', 'in_transit', 'at_delivery', 'delivered', 'completed'

-- Add assigned driver name for quick display (in addition to assigned_driver_id)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS marketplace_driver_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS last_status_update TIMESTAMPTZ;

-- Create status updates log table for audit trail
CREATE TABLE IF NOT EXISTS load_status_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  marketplace_request_id UUID REFERENCES load_requests(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  updated_by_user_id UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_loads_marketplace_request ON loads(marketplace_request_id) WHERE marketplace_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loads_is_from_marketplace ON loads(is_from_marketplace) WHERE is_from_marketplace = true;
CREATE INDEX IF NOT EXISTS idx_loads_source_company ON loads(source_company_id) WHERE source_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loads_operational_status ON loads(operational_status);
CREATE INDEX IF NOT EXISTS idx_load_status_updates_load ON load_status_updates(load_id);
CREATE INDEX IF NOT EXISTS idx_load_status_updates_time ON load_status_updates(updated_at DESC);

-- Add trip_id to loads for direct assignment
ALTER TABLE loads ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS trip_load_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_loads_trip ON loads(trip_id) WHERE trip_id IS NOT NULL;

-- Function to update operational status and log the change
CREATE OR REPLACE FUNCTION update_load_operational_status(
  p_load_id UUID,
  p_new_status TEXT,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_lat DECIMAL(10,8) DEFAULT NULL,
  p_lng DECIMAL(11,8) DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_old_status TEXT;
  v_marketplace_request_id UUID;
BEGIN
  -- Get current status
  SELECT operational_status, marketplace_request_id
  INTO v_old_status, v_marketplace_request_id
  FROM loads WHERE id = p_load_id;

  -- Update the load
  UPDATE loads SET
    operational_status = p_new_status,
    last_status_update = now(),
    updated_at = now()
  WHERE id = p_load_id;

  -- Log the status change
  INSERT INTO load_status_updates (
    load_id, marketplace_request_id, old_status, new_status,
    updated_by_user_id, notes, location_lat, location_lng
  ) VALUES (
    p_load_id, v_marketplace_request_id, v_old_status, p_new_status,
    p_user_id, p_notes, p_lat, p_lng
  );

  -- If this is a marketplace load, update the marketplace status for company visibility
  IF v_marketplace_request_id IS NOT NULL THEN
    -- Update the load_requests table with latest status for company queries
    UPDATE load_requests SET
      updated_at = now()
    WHERE id = v_marketplace_request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on new table
ALTER TABLE load_status_updates ENABLE ROW LEVEL SECURITY;

-- RLS policies for load_status_updates (drop first to be idempotent)
DROP POLICY IF EXISTS "Users can view status updates for their company loads" ON load_status_updates;
CREATE POLICY "Users can view status updates for their company loads"
ON load_status_updates FOR SELECT
USING (
  load_id IN (
    SELECT id FROM loads
    WHERE owner_id = auth.uid()
    OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
    OR assigned_carrier_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
    OR source_company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert status updates for their loads" ON load_status_updates;
CREATE POLICY "Users can insert status updates for their loads"
ON load_status_updates FOR INSERT
WITH CHECK (
  load_id IN (
    SELECT id FROM loads
    WHERE owner_id = auth.uid()
    OR assigned_carrier_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  )
);

-- Comment on new columns
COMMENT ON COLUMN loads.marketplace_request_id IS 'Links to the load_request that was accepted';
COMMENT ON COLUMN loads.is_from_marketplace IS 'True if this load came from marketplace assignment';
COMMENT ON COLUMN loads.source_company_id IS 'The company that originally posted this load';
COMMENT ON COLUMN loads.source_company_name IS 'Cached name of source company for display';
COMMENT ON COLUMN loads.operational_status IS 'Current operational status of the load';
COMMENT ON COLUMN loads.trip_id IS 'The trip this load is assigned to';
COMMENT ON COLUMN loads.trip_load_order IS 'Order of this load within the trip';
COMMENT ON TABLE load_status_updates IS 'Audit log of load status changes';
