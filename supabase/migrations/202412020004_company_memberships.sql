BEGIN;

CREATE TABLE IF NOT EXISTS public.company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_id ON public.company_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_company_id ON public.company_memberships (company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_memberships_user_company ON public.company_memberships (user_id, company_id);

-- RLS setup
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their memberships" ON public.company_memberships;
CREATE POLICY "Users can view their memberships"
  ON public.company_memberships
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their memberships" ON public.company_memberships;
CREATE POLICY "Users can manage their memberships"
  ON public.company_memberships
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
