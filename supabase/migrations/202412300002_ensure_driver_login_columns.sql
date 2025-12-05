BEGIN;
-- ============================================================================
-- DRIVERS TABLE - Ensure login-related columns exist with proper constraints
-- ============================================================================

-- Ensure has_login column exists and is NOT NULL with default false
DO $$
BEGIN
  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'drivers' 
      AND column_name = 'has_login'
  ) THEN
    ALTER TABLE public.drivers
      ADD COLUMN has_login BOOLEAN NOT NULL DEFAULT false;
  ELSE
    -- Update existing column to be NOT NULL if it's nullable
    ALTER TABLE public.drivers
      ALTER COLUMN has_login SET DEFAULT false;
    
    -- Set default for any NULL values
    UPDATE public.drivers
    SET has_login = false
    WHERE has_login IS NULL;
    
    -- Make column NOT NULL
    ALTER TABLE public.drivers
      ALTER COLUMN has_login SET NOT NULL;
  END IF;
END $$;
-- Ensure login_method column exists with CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'drivers' 
      AND column_name = 'login_method'
  ) THEN
    ALTER TABLE public.drivers
      ADD COLUMN login_method TEXT
        CHECK (login_method IS NULL OR login_method = ANY (ARRAY['email'::text, 'phone'::text]));
  ELSE
    -- Ensure CHECK constraint exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.drivers'::regclass 
        AND conname = 'drivers_login_method_check'
    ) THEN
      ALTER TABLE public.drivers
        ADD CONSTRAINT drivers_login_method_check
        CHECK (login_method IS NULL OR login_method = ANY (ARRAY['email'::text, 'phone'::text]));
    END IF;
  END IF;
END $$;
-- Ensure auth_user_id column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'drivers' 
      AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.drivers
      ADD COLUMN auth_user_id UUID;
  END IF;
END $$;
-- Ensure email column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'drivers' 
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.drivers
      ADD COLUMN email TEXT;
  END IF;
END $$;
-- Ensure phone column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'drivers' 
      AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.drivers
      ADD COLUMN phone TEXT;
  END IF;
END $$;
-- Add foreign key constraint on auth_user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.drivers'::regclass 
      AND conname = 'drivers_auth_user_id_fkey'
  ) THEN
    ALTER TABLE public.drivers
      ADD CONSTRAINT drivers_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) 
      REFERENCES auth.users(id) 
      ON DELETE SET NULL;
  END IF;
END $$;
-- Add index on auth_user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_drivers_auth_user_id ON public.drivers(auth_user_id);
COMMIT;
