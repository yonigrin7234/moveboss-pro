BEGIN;
-- ============================================================================
-- COMPANIES TABLE - Add missing columns
-- ============================================================================

-- Core fields
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS dba_name TEXT,
  ADD COLUMN IF NOT EXISTS company_type TEXT NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text]));
-- Primary Contact
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_email TEXT;
-- Dispatch / Loading Contact
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS dispatch_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_notes TEXT;
-- Billing Address
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS billing_street TEXT,
  ADD COLUMN IF NOT EXISTS billing_city TEXT,
  ADD COLUMN IF NOT EXISTS billing_state TEXT,
  ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'USA',
  ADD COLUMN IF NOT EXISTS billing_notes TEXT;
-- Create updated_at trigger for companies if it doesn't exist
DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
-- Add index for owner_id if it doesn't exist
CREATE INDEX IF NOT EXISTS companies_owner_id_idx ON public.companies (owner_id);
-- ============================================================================
-- DRIVERS TABLE - Add missing columns
-- ============================================================================

-- Dates
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS start_date DATE;
-- Login
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS has_login BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;
-- License / Compliance (update existing license_expiration to license_expiry)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'license_expiration'
  ) THEN
    ALTER TABLE public.drivers RENAME COLUMN license_expiration TO license_expiry;
  END IF;
END $$;
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS license_expiry DATE,
  ADD COLUMN IF NOT EXISTS medical_card_expiry DATE;
-- Make license_number and license_expiry required (but allow NULL for now to avoid breaking existing data)
-- We'll enforce this in application logic

-- Assignment & Status
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS assigned_truck_id UUID REFERENCES public.trucks (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_trailer_id UUID REFERENCES public.trailers (id) ON DELETE SET NULL;
-- Compensation - Update existing compensation_type to pay_mode and add new fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'compensation_type'
  ) THEN
    -- Drop the old constraint first
    ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_compensation_type_check;
    
    -- Map existing values to new pay_mode values
    UPDATE public.drivers SET compensation_type = 
      CASE 
        WHEN compensation_type = 'per_mile' THEN 'per_mile'
        WHEN compensation_type = 'per_cubic_ft' THEN 'per_cuft'
        WHEN compensation_type = 'per_mile_and_cubic_ft' THEN 'per_mile_and_cuft'
        WHEN compensation_type = 'daily_flat' THEN 'flat_daily_rate'
        WHEN compensation_type = 'hourly' THEN 'flat_daily_rate' -- Map hourly to flat_daily_rate
        WHEN compensation_type = 'custom' THEN 'flat_daily_rate' -- Map custom to flat_daily_rate
        ELSE 'per_mile'
      END;
    ALTER TABLE public.drivers RENAME COLUMN compensation_type TO pay_mode;
  END IF;
END $$;
-- Add pay_mode column if it doesn't exist, with constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'pay_mode'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN pay_mode TEXT NOT NULL DEFAULT 'per_mile';
  END IF;
  
  -- Add or update the constraint
  ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_pay_mode_check;
  ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_pay_mode_check
    CHECK (pay_mode = ANY (ARRAY['per_mile'::text, 'per_cuft'::text, 'per_mile_and_cuft'::text, 'percent_of_revenue'::text, 'flat_daily_rate'::text]));
END $$;
-- Update rate fields - rename existing ones and add new ones
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'rate_per_cubic_ft'
  ) THEN
    ALTER TABLE public.drivers RENAME COLUMN rate_per_cubic_ft TO rate_per_cuft;
  END IF;
END $$;
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS rate_per_mile NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS rate_per_cuft NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS percent_of_revenue NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS flat_daily_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pay_notes TEXT;
-- Remove old compensation fields if they exist
ALTER TABLE public.drivers
  DROP COLUMN IF EXISTS daily_flat_rate,
  DROP COLUMN IF EXISTS hourly_rate,
  DROP COLUMN IF EXISTS custom_comp_notes;
-- Add indexes
CREATE INDEX IF NOT EXISTS drivers_assigned_truck_id_idx ON public.drivers (assigned_truck_id);
CREATE INDEX IF NOT EXISTS drivers_assigned_trailer_id_idx ON public.drivers (assigned_trailer_id);
-- ============================================================================
-- TRUCKS TABLE - Add missing columns
-- ============================================================================

-- Keep unit_number (don't rename) - just ensure it exists
ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS unit_number TEXT;
-- Vehicle & Registration
ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS current_odometer NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS registration_expiry DATE,
  ADD COLUMN IF NOT EXISTS inspection_expiry DATE;
-- Vehicle type and capacity
ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS cubic_capacity INTEGER;
-- Rental unit fields
ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS is_rental_unit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rental_company TEXT,
  ADD COLUMN IF NOT EXISTS rental_company_other TEXT,
  ADD COLUMN IF NOT EXISTS rental_truck_number TEXT;
-- Assignment
ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES public.drivers (id) ON DELETE SET NULL;
-- Update status check constraint to include 'suspended'
ALTER TABLE public.trucks
  DROP CONSTRAINT IF EXISTS trucks_status_check;
ALTER TABLE public.trucks
  ADD CONSTRAINT trucks_status_check 
  CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'maintenance'::text]));
-- Keep existing unique constraint for unit_number (don't rename)
-- The constraint trucks_owner_unit_number_unique should already exist

-- Add index
CREATE INDEX IF NOT EXISTS trucks_assigned_driver_id_idx ON public.trucks (assigned_driver_id);
-- ============================================================================
-- TRAILERS TABLE - Add missing columns
-- ============================================================================

-- Keep unit_number (don't rename) - ensure it exists and is NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trailers' 
    AND column_name = 'unit_number'
  ) THEN
    ALTER TABLE public.trailers ADD COLUMN unit_number TEXT;
    -- Set default for existing rows
    UPDATE public.trailers SET unit_number = 'TRAILER-' || id::text WHERE unit_number IS NULL;
    -- Now make it NOT NULL
    ALTER TABLE public.trailers ALTER COLUMN unit_number SET NOT NULL;
  ELSE
    -- Column exists, ensure it's NOT NULL if it isn't already
    ALTER TABLE public.trailers ALTER COLUMN unit_number SET NOT NULL;
  END IF;
END $$;
-- Vehicle Info
ALTER TABLE public.trailers
  ADD COLUMN IF NOT EXISTS vin TEXT,
  ADD COLUMN IF NOT EXISTS make TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS capacity_cuft INTEGER,
  ADD COLUMN IF NOT EXISTS side_doors_count INTEGER DEFAULT 0;
-- Compliance
ALTER TABLE public.trailers
  ADD COLUMN IF NOT EXISTS registration_expiry DATE,
  ADD COLUMN IF NOT EXISTS inspection_expiry DATE;
-- Assignment
ALTER TABLE public.trailers
  ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES public.drivers (id) ON DELETE SET NULL;
-- Update status check constraint to include 'suspended'
ALTER TABLE public.trailers
  DROP CONSTRAINT IF EXISTS trailers_status_check;
ALTER TABLE public.trailers
  ADD CONSTRAINT trailers_status_check 
  CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'maintenance'::text]));
-- Ensure type constraint exists (may have been removed)
-- Keep existing unique constraint for unit_number (don't rename)
-- The constraint trailers_owner_unit_number_unique should already exist

-- Add index
CREATE INDEX IF NOT EXISTS trailers_assigned_driver_id_idx ON public.trailers (assigned_driver_id);
COMMIT;
