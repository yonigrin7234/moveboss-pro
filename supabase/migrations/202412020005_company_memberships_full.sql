BEGIN;
-- Create table if it does not exist
CREATE TABLE IF NOT EXISTS public.company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Ensure columns exist (for previously created table variants)
ALTER TABLE public.company_memberships
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_id ON public.company_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_company_id ON public.company_memberships (company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_memberships_user_primary
  ON public.company_memberships (user_id) WHERE is_primary = TRUE;
-- RLS
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can select their memberships" ON public.company_memberships;
CREATE POLICY "Users can select their memberships"
  ON public.company_memberships
  FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their memberships" ON public.company_memberships;
CREATE POLICY "Users can insert their memberships"
  ON public.company_memberships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their memberships" ON public.company_memberships;
CREATE POLICY "Users can update their memberships"
  ON public.company_memberships
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their memberships" ON public.company_memberships;
CREATE POLICY "Users can delete their memberships"
  ON public.company_memberships
  FOR DELETE
  USING (auth.uid() = user_id);
COMMIT;
