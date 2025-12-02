-- ============================================
-- FIX: Loads Marketplace RLS Policy
-- ============================================
-- The previous policy used load_status='pending' but marketplace queries
-- use posting_status='posted'. These are different fields!

-- Drop the existing policy
DROP POLICY IF EXISTS loads_select_policy ON public.loads;

-- Recreate with correct condition
CREATE POLICY loads_select_policy
  ON public.loads
  FOR SELECT
  TO authenticated
  USING (
    -- Marketplace-visible loads can be seen by anyone
    -- Use posting_status='posted' instead of load_status='pending'
    (is_marketplace_visible = true AND posting_status = 'posted' AND assigned_carrier_id IS NULL)
    -- Or own loads
    OR owner_id = auth.uid()
    -- Or loads where user's company is the assigned carrier (using SECURITY DEFINER function)
    OR public.user_owns_assigned_carrier(assigned_carrier_id)
  );

COMMENT ON POLICY loads_select_policy ON public.loads IS
  'Allows viewing marketplace loads (posted), own loads, and assigned loads';
