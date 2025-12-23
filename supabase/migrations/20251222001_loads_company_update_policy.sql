-- ============================================
-- ADD UPDATE POLICY FOR COMPANY MEMBERS
-- ============================================
-- Allow any member of a company to update loads that belong to their company
-- This enables brokers/owners to post loads to marketplace even if they didn't create the load

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS loads_company_update_policy ON public.loads;

-- Create policy to allow company members to update their company's loads
CREATE POLICY loads_company_update_policy
  ON public.loads
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if user's company owns this load (via company_id or posted_by_company_id)
    EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.user_id = auth.uid()
      AND (
        cm.company_id = loads.company_id
        OR cm.company_id = loads.posted_by_company_id
      )
    )
    -- Or if user directly owns the company that owns this load
    OR EXISTS (
      SELECT 1 FROM companies c
      WHERE c.owner_id = auth.uid()
      AND (
        c.id = loads.company_id
        OR c.id = loads.posted_by_company_id
      )
    )
  )
  WITH CHECK (
    -- Same check for the new row
    EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.user_id = auth.uid()
      AND (
        cm.company_id = loads.company_id
        OR cm.company_id = loads.posted_by_company_id
      )
    )
    OR EXISTS (
      SELECT 1 FROM companies c
      WHERE c.owner_id = auth.uid()
      AND (
        c.id = loads.company_id
        OR c.id = loads.posted_by_company_id
      )
    )
  );

COMMENT ON POLICY loads_company_update_policy ON public.loads IS
  'Allows company members to update loads that belong to their company';
