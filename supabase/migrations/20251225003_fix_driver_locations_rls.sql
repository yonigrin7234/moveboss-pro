-- Fix driver_locations RLS policy to allow drivers to insert their own locations
-- Previously, only the owner could insert (owner_id = auth.uid())
-- Now, drivers can insert if their driver record's owner_id matches

BEGIN;

-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS driver_locations_insert_policy ON public.driver_locations;

-- Create new INSERT policy that allows:
-- 1. Owners to insert directly (owner_id = auth.uid())
-- 2. Drivers to insert for their owner (driver's owner_id matches the row's owner_id)
CREATE POLICY driver_locations_insert_policy
  ON public.driver_locations
  FOR INSERT
  WITH CHECK (
    -- Owner inserting directly
    owner_id = auth.uid()
    OR
    -- Driver inserting: their driver record's owner_id must match the row's owner_id
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_id
        AND d.auth_user_id = auth.uid()
        AND d.owner_id = owner_id
    )
  );

-- Also update SELECT policy to allow drivers to see their own locations
DROP POLICY IF EXISTS driver_locations_select_policy ON public.driver_locations;

CREATE POLICY driver_locations_select_policy
  ON public.driver_locations
  FOR SELECT
  USING (
    -- Owner can see all their drivers' locations
    owner_id = auth.uid()
    OR
    -- Driver can see their own locations
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_id
        AND d.auth_user_id = auth.uid()
    )
  );

COMMIT;
