BEGIN;

-- Companies: capabilities
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_capabilities TEXT[] NOT NULL DEFAULT '{}';

-- Company memberships
CREATE TABLE IF NOT EXISTS public.company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS company_memberships_company_id_idx ON public.company_memberships(company_id);
CREATE INDEX IF NOT EXISTS company_memberships_user_id_idx ON public.company_memberships(user_id);

-- Policies: users can read their own memberships or ones owned by their companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_memberships' AND policyname = 'company_memberships_select_self_or_owner'
  ) THEN
    CREATE POLICY company_memberships_select_self_or_owner
      ON public.company_memberships
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = company_memberships.company_id
          AND c.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_memberships' AND policyname = 'company_memberships_insert_self_or_owner'
  ) THEN
    CREATE POLICY company_memberships_insert_self_or_owner
      ON public.company_memberships
      FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = company_memberships.company_id
          AND c.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_memberships' AND policyname = 'company_memberships_update_owner'
  ) THEN
    CREATE POLICY company_memberships_update_owner
      ON public.company_memberships
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = company_memberships.company_id
          AND c.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = company_memberships.company_id
          AND c.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_memberships' AND policyname = 'company_memberships_delete_owner'
  ) THEN
    CREATE POLICY company_memberships_delete_owner
      ON public.company_memberships
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = company_memberships.company_id
          AND c.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Drivers: add tenancy + types
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS leased_to_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_type TEXT NOT NULL DEFAULT 'company_driver';

CREATE INDEX IF NOT EXISTS drivers_company_id_idx ON public.drivers(company_id);
CREATE INDEX IF NOT EXISTS drivers_owner_id_idx ON public.drivers(owner_id);

COMMIT;
