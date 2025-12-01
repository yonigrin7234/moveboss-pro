-- ============================================
-- FIX: Loads Marketplace RLS Policy
-- ============================================
-- The current policy isn't working as expected. Let's simplify it.

-- Drop the existing marketplace policy
DROP POLICY IF EXISTS loads_marketplace_select_policy ON public.loads;

-- Create a simpler policy that explicitly allows:
-- 1. Viewing marketplace-visible loads (for any authenticated user)
-- 2. Viewing own loads
-- 3. Viewing assigned loads
CREATE POLICY loads_select_policy
  ON public.loads
  FOR SELECT
  TO authenticated
  USING (
    -- Marketplace-visible loads can be seen by anyone
    (is_marketplace_visible = true AND load_status = 'pending' AND assigned_carrier_id IS NULL)
    -- Or own loads
    OR owner_id = auth.uid()
    -- Or loads where user's company is the assigned carrier
    OR EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = loads.assigned_carrier_id
      AND c.owner_id = auth.uid()
    )
  );

COMMENT ON POLICY loads_select_policy ON public.loads IS
  'Allows viewing marketplace loads, own loads, and assigned loads';
