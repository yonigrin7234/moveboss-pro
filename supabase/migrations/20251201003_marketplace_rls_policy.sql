-- ============================================
-- MARKETPLACE RLS POLICY FOR LOADS
-- ============================================
-- Allows any authenticated user to view loads that are posted to the marketplace
-- This is necessary because marketplace loads need to be visible to all companies,
-- not just the owner.

-- First, ensure RLS is enabled on the loads table
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;

-- Drop existing marketplace policy if it exists (idempotent)
DROP POLICY IF EXISTS loads_marketplace_select_policy ON public.loads;

-- Create policy to allow reading marketplace-visible loads
-- Any authenticated user can see loads where is_marketplace_visible = true
CREATE POLICY loads_marketplace_select_policy
  ON public.loads
  FOR SELECT
  USING (
    -- Allow if load is visible on marketplace
    is_marketplace_visible = true
    -- Or if the user owns the load (owner can always see their own loads)
    OR owner_id = auth.uid()
    -- Or if user is assigned carrier
    OR assigned_carrier_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- Note: This policy uses OR conditions so users can see:
-- 1. Any load posted to marketplace (is_marketplace_visible = true)
-- 2. Their own loads (owner_id = auth.uid())
-- 3. Loads assigned to their company (assigned_carrier_id)

COMMENT ON POLICY loads_marketplace_select_policy ON public.loads IS
  'Allows viewing marketplace-visible loads, own loads, and loads assigned to user company';
