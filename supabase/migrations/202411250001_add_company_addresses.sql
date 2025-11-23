BEGIN;

-- ============================================================================
-- COMPANIES TABLE - Add address fields
-- ============================================================================

-- Main Company Address
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';

-- Primary Contact Address
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS primary_contact_street TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_city TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_state TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_country TEXT DEFAULT 'USA';

-- Dispatch / Loading Contact Address
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS dispatch_contact_street TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_contact_city TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_contact_state TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_contact_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_contact_country TEXT DEFAULT 'USA';

-- Loading Location Type
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS loading_location_type TEXT
    CHECK (loading_location_type IS NULL OR loading_location_type = ANY (ARRAY['public_storage'::text, 'warehouse'::text]));

COMMIT;

