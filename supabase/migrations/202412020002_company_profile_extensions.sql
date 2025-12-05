BEGIN;
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS company_role TEXT,
  ADD COLUMN IF NOT EXISTS default_distance_unit TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
-- company_capabilities already added in a prior migration; keep idempotent add here too
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_capabilities TEXT[] NOT NULL DEFAULT '{}';
COMMIT;
