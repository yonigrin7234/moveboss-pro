-- Fix: Allow drivers to see company_memberships for users in their company
-- This is needed for the profiles RLS policy to work correctly
-- Uses SECURITY DEFINER function to avoid RLS recursion

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view memberships in their companies" ON public.company_memberships;

-- Create a new security definer function to get user's company IDs as a set
-- This is different from the existing get_user_company_ids which returns UUID[]
-- This one returns SETOF UUID for use with IN (SELECT ...) and includes drivers
CREATE OR REPLACE FUNCTION public.get_user_company_ids_set(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM company_memberships WHERE user_id = user_uuid
  UNION
  SELECT company_id FROM drivers WHERE auth_user_id = user_uuid
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_company_ids_set(UUID) TO authenticated;

-- Create the fixed policy using the new function
CREATE POLICY "Users can view memberships in their companies"
  ON public.company_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    company_id IN (SELECT public.get_user_company_ids_set(auth.uid()))
  );
