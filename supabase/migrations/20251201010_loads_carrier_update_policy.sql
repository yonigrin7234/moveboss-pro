-- ============================================
-- ADD UPDATE POLICY FOR ASSIGNED CARRIERS
-- ============================================
-- Carriers assigned to a load need to be able to update it
-- (for confirmation, driver assignment, status changes, etc.)

-- Create policy to allow assigned carriers to update their loads
CREATE POLICY loads_carrier_update_policy
  ON public.loads
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if user's company is the assigned carrier
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = loads.assigned_carrier_id
      AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same check for the new row
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = loads.assigned_carrier_id
      AND c.owner_id = auth.uid()
    )
  );
-- Also allow load owners to update their own loads
CREATE POLICY loads_owner_update_policy
  ON public.loads
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
COMMENT ON POLICY loads_carrier_update_policy ON public.loads IS
  'Allows assigned carriers to update loads (confirm, assign driver, change status)';
COMMENT ON POLICY loads_owner_update_policy ON public.loads IS
  'Allows load owners to update their own loads';
