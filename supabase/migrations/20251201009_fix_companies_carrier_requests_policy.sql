-- ============================================
-- Fix RLS policies for carrier requests visibility
-- ============================================
-- The previous migration caused RLS recursion issues.
-- Using SECURITY DEFINER functions to safely bypass RLS during policy evaluation.

-- Drop the problematic policies from the previous migration
DROP POLICY IF EXISTS companies_carrier_requests_select ON public.companies;
DROP POLICY IF EXISTS companies_load_poster_select ON public.companies;

-- Create helper function: Check if user owns loads that this company has requested
CREATE OR REPLACE FUNCTION public.user_owns_load_requested_by_company(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.load_requests lr
    JOIN public.loads l ON l.id = lr.load_id
    WHERE lr.carrier_id = p_company_id
    AND l.owner_id = auth.uid()
  );
$$;

-- Create helper function: Check if user has requested loads from this company
CREATE OR REPLACE FUNCTION public.user_requested_load_from_company(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.load_requests lr
    JOIN public.loads l ON l.id = lr.load_id
    WHERE l.company_id = p_company_id
    AND lr.carrier_owner_id = auth.uid()
  );
$$;

-- Recreate policies using the helper functions
CREATE POLICY companies_carrier_requests_select
  ON public.companies
  FOR SELECT
  USING (
    public.user_owns_load_requested_by_company(id)
  );

CREATE POLICY companies_load_poster_select
  ON public.companies
  FOR SELECT
  USING (
    public.user_requested_load_from_company(id)
  );

COMMENT ON FUNCTION public.user_owns_load_requested_by_company IS
  'Checks if the current user owns loads that a company has requested. Used for RLS on companies table.';

COMMENT ON FUNCTION public.user_requested_load_from_company IS
  'Checks if the current user has requested loads from a company. Used for RLS on companies table.';
