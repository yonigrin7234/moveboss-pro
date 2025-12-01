-- Fix missing is_workspace_company flags for existing companies
-- This migration ensures that every user who owns companies has exactly one workspace company

BEGIN;

-- Step 1: For users who have companies but NO workspace company,
-- set the oldest company they own as their workspace company
UPDATE public.companies
SET is_workspace_company = TRUE
WHERE id IN (
  -- Find the oldest company for each owner who has no workspace company
  SELECT DISTINCT ON (owner_id) id
  FROM public.companies
  WHERE owner_id IN (
    -- Users who own companies but have NO workspace company
    SELECT DISTINCT owner_id
    FROM public.companies
    WHERE owner_id IS NOT NULL
    GROUP BY owner_id
    HAVING COUNT(*) FILTER (WHERE is_workspace_company = TRUE) = 0
  )
  ORDER BY owner_id, created_at ASC
);

-- Step 2: Ensure all workspace company owners have a primary membership
INSERT INTO public.company_memberships (user_id, company_id, role, is_primary)
SELECT c.owner_id, c.id, 'owner', TRUE
FROM public.companies c
WHERE c.is_workspace_company = TRUE
  AND c.owner_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO UPDATE
SET role = 'owner', is_primary = TRUE;

-- Step 3: Log how many companies were fixed (for debugging)
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM public.companies
  WHERE is_workspace_company = TRUE;

  RAISE NOTICE 'Total workspace companies after fix: %', fixed_count;
END $$;

COMMIT;
