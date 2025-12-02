-- ============================================
-- FIX: Loads SELECT Policy with SECURITY DEFINER
-- ============================================
-- The current policy has a subquery on companies which is subject to RLS.
-- Using SECURITY DEFINER function to bypass RLS during policy evaluation.

-- Create helper function: Check if user owns the assigned carrier company
CREATE OR REPLACE FUNCTION public.user_owns_assigned_carrier(p_assigned_carrier_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = p_assigned_carrier_id
    AND c.owner_id = auth.uid()
  );
$$;

-- Drop the existing policy
DROP POLICY IF EXISTS loads_select_policy ON public.loads;

-- Recreate with SECURITY DEFINER function
CREATE POLICY loads_select_policy
  ON public.loads
  FOR SELECT
  TO authenticated
  USING (
    -- Marketplace-visible loads can be seen by anyone
    (is_marketplace_visible = true AND load_status = 'pending' AND assigned_carrier_id IS NULL)
    -- Or own loads
    OR owner_id = auth.uid()
    -- Or loads where user's company is the assigned carrier (using SECURITY DEFINER function)
    OR public.user_owns_assigned_carrier(assigned_carrier_id)
  );

COMMENT ON FUNCTION public.user_owns_assigned_carrier IS
  'Checks if the current user owns the company assigned as carrier. Used for RLS on loads table.';

COMMENT ON POLICY loads_select_policy ON public.loads IS
  'Allows viewing marketplace loads, own loads, and assigned loads';
