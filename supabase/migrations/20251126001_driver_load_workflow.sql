-- Migration: Complete driver load workflow fields
-- Purpose: Enable accept/start/finish loading workflow with company contact info

-- ============================================================================
-- 1. ADD COMPANY CONTACT FIELDS (if not exists)
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS dispatch_contact_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS dispatch_contact_phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS dispatch_contact_email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS zip TEXT;
-- ============================================================================
-- 2. UPDATE LOAD STATUS CONSTRAINT TO INCLUDE NEW STATUSES
-- ============================================================================

-- Drop existing constraint and add new one with expanded statuses
ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_load_status_check;
DO $$ BEGIN
  ALTER TABLE loads ADD CONSTRAINT loads_load_status_check
    CHECK (load_status IN ('pending', 'accepted', 'loading', 'loaded', 'in_transit', 'delivered', 'storage_completed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================================
-- 3. ADD LOAD WORKFLOW FIELDS
-- ============================================================================

-- Accept workflow
ALTER TABLE loads ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
-- Loading workflow fields
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_started_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_finished_at TIMESTAMPTZ;
-- CUFT tracking during loading (before/after this load)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS starting_cuft NUMERIC(10,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS ending_cuft NUMERIC(10,2);
-- Loading photos (before and after)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_start_photo TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_end_photo TEXT;
-- First available delivery date
ALTER TABLE loads ADD COLUMN IF NOT EXISTS first_available_date DATE;
-- ============================================================================
-- 4. ADD LOAD ORDER TO TRIP_LOADS JUNCTION TABLE
-- ============================================================================

ALTER TABLE trip_loads ADD COLUMN IF NOT EXISTS load_order INTEGER DEFAULT 1;
-- ============================================================================
-- DONE
-- ============================================================================;
