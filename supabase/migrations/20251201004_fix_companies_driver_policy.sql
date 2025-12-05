-- ============================================
-- FIX: Companies Driver Policy Security Definer
-- ============================================
-- The companies_driver_select_policy queries the loads table.
-- When loads RLS is strict, this can cause permission issues.
--
-- Solution: Use a SECURITY DEFINER function to bypass loads RLS
-- when checking if a driver has access to a company.

-- Create a helper function that runs as the definer (bypasses RLS)
CREATE OR REPLACE FUNCTION public.driver_has_company_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loads l
    JOIN public.trip_loads tl ON tl.load_id = l.id
    JOIN public.trips t ON t.id = tl.trip_id
    WHERE l.company_id = p_company_id
    AND public.is_trip_driver(t.driver_id)
  );
$$;
-- Drop and recreate the policy using the helper function
DROP POLICY IF EXISTS companies_driver_select_policy ON public.companies;
CREATE POLICY companies_driver_select_policy
  ON public.companies
  FOR SELECT
  USING (
    public.driver_has_company_access(id)
  );
COMMENT ON FUNCTION public.driver_has_company_access IS
  'Checks if current user (as driver) has access to a company through trip assignments. Uses SECURITY DEFINER to bypass loads RLS.';
