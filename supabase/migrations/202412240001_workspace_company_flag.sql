BEGIN;
-- Workspace flag so we can separate the owning business from partner/relationship companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_workspace_company BOOLEAN NOT NULL DEFAULT FALSE;
-- One workspace company per owner account
CREATE UNIQUE INDEX IF NOT EXISTS companies_owner_workspace_unique
  ON public.companies (owner_id)
  WHERE is_workspace_company = TRUE;
-- Promote any existing primary membership companies to workspace companies
UPDATE public.companies AS c
SET is_workspace_company = TRUE
FROM public.company_memberships AS m
WHERE m.company_id = c.id
  AND m.is_primary = TRUE;
-- Ensure the workspace owner has a primary membership record for the workspace company
INSERT INTO public.company_memberships (user_id, company_id, role, is_primary)
SELECT c.owner_id, c.id, 'owner', TRUE
FROM public.companies AS c
WHERE c.is_workspace_company = TRUE
ON CONFLICT (user_id, company_id) DO NOTHING;
UPDATE public.company_memberships AS m
SET role = 'owner',
    is_primary = TRUE
FROM public.companies AS c
WHERE m.company_id = c.id
  AND c.is_workspace_company = TRUE
  AND m.user_id = c.owner_id;
COMMIT;
