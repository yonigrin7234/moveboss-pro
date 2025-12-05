-- ============================================
-- COMPANIES MARKETPLACE VISIBILITY POLICY
-- ============================================
-- When viewing marketplace loads, users need to see basic info about
-- the company that posted the load (name, city, state, ratings).
-- This policy allows viewing companies that have posted marketplace-visible loads.

-- Create a helper function to check if a company has marketplace-visible loads
CREATE OR REPLACE FUNCTION public.company_has_marketplace_loads(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loads
    WHERE (company_id = p_company_id OR posted_by_company_id = p_company_id)
    AND is_marketplace_visible = true
  );
$$;
-- Add policy to allow viewing companies with marketplace loads
DROP POLICY IF EXISTS companies_marketplace_select ON public.companies;
CREATE POLICY companies_marketplace_select
  ON public.companies
  FOR SELECT
  USING (
    -- Allow if company has marketplace-visible loads
    public.company_has_marketplace_loads(id)
  );
COMMENT ON FUNCTION public.company_has_marketplace_loads IS
  'Checks if a company has any marketplace-visible loads. Used for RLS on companies table.';
COMMENT ON POLICY companies_marketplace_select ON public.companies IS
  'Allows viewing companies that have posted loads to the marketplace';
