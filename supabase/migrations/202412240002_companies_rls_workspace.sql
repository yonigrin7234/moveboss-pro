BEGIN;

-- Enable RLS on companies with owner-scoped policies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Clean slate policies
DROP POLICY IF EXISTS companies_select_owner ON public.companies;
DROP POLICY IF EXISTS companies_insert_owner ON public.companies;
DROP POLICY IF EXISTS companies_update_owner ON public.companies;
DROP POLICY IF EXISTS companies_delete_partner_only ON public.companies;

-- Select: owners can read their companies (workspace + partners)
CREATE POLICY companies_select_owner
  ON public.companies
  FOR SELECT
  USING (owner_id = auth.uid());

-- Insert: owners can insert their own companies
CREATE POLICY companies_insert_owner
  ON public.companies
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Update: owners can update their companies; workspace company still restricted to owner by this check
CREATE POLICY companies_update_owner
  ON public.companies
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Delete: owners may delete partner companies only (workspace companies are protected)
CREATE POLICY companies_delete_partner_only
  ON public.companies
  FOR DELETE
  USING (owner_id = auth.uid() AND is_workspace_company = FALSE);

COMMIT;
