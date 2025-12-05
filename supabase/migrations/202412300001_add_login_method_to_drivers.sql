BEGIN;
-- Add login_method column to drivers table
-- This column stores whether the driver logs in via 'email' or 'phone'
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS login_method TEXT
    CHECK (login_method IS NULL OR login_method = ANY (ARRAY['email'::text, 'phone'::text]));
-- Set default value for existing drivers with has_login = true
-- Default to 'email' if they have an email, otherwise 'phone'
UPDATE public.drivers
SET login_method = CASE
  WHEN email IS NOT NULL AND email != '' THEN 'email'
  WHEN phone IS NOT NULL AND phone != '' THEN 'phone'
  ELSE 'email'
END
WHERE has_login = true AND login_method IS NULL;
COMMIT;
