-- Migration: Add trust_level to companies and loading/delivery flow fields to loads
-- Purpose: Enable COD vs Trusted company tracking and driver loading/delivery workflows

-- ============================================================================
-- 1. ADD TRUST_LEVEL TO COMPANIES
-- ============================================================================

-- Add trust_level column to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'cod_required';

-- Add constraint for valid trust levels
DO $$ BEGIN
  ALTER TABLE companies ADD CONSTRAINT companies_trust_level_check
    CHECK (trust_level IN ('trusted', 'cod_required'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. ADD LOADING/DELIVERY TRACKING FIELDS TO LOADS
-- ============================================================================

-- Loading workflow fields
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_started_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_completed_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_notes TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_photos TEXT[];

-- Delivery workflow fields
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_started_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_photos TEXT[];
ALTER TABLE loads ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Origin arrival (when driver arrives at pickup)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_arrival_at TIMESTAMPTZ;

-- Load report photo (photo of customer's load sheet at pickup)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS load_report_photo_url TEXT;

-- Delivery report photo (photo of signed delivery receipt)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_report_photo_url TEXT;

-- Company approved exception for delivery (for COD companies that approve delivery without payment)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS company_approved_exception_delivery BOOLEAN DEFAULT false;

-- ============================================================================
-- 3. CREATE LOAD_PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS load_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Payment classification
  payment_type TEXT NOT NULL CHECK (payment_type IN ('customer_balance', 'company_prepay', 'accessorial', 'cod')),

  -- Amount and method
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'zelle', 'check', 'card', 'venmo', 'money_order', 'other')),

  -- Whether this was in the original contract
  is_in_contract BOOLEAN DEFAULT false,

  -- Who collected and when
  collected_by TEXT CHECK (collected_by IN ('driver', 'company', 'office')),
  collected_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional info
  notes TEXT,
  reference_number TEXT, -- Check number, Zelle confirmation, etc.

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for load_payments
ALTER TABLE load_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own load_payments" ON load_payments
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own load_payments" ON load_payments
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own load_payments" ON load_payments
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own load_payments" ON load_payments
  FOR DELETE USING (owner_id = auth.uid());

-- Index for load lookups
CREATE INDEX IF NOT EXISTS idx_load_payments_load_id ON load_payments(load_id);
CREATE INDEX IF NOT EXISTS idx_load_payments_owner_id ON load_payments(owner_id);

-- ============================================================================
-- 4. CREATE ACCESSORIALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS accessorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Accessorial type
  type TEXT NOT NULL CHECK (type IN (
    'shuttle', 'stairs', 'long_carry', 'bulky_items', 'packing',
    'waiting_time', 'storage', 'hoisting', 'split_delivery',
    'redelivery', 'unpacking', 'debris_removal', 'other'
  )),

  -- Details
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,

  -- Who pays - is it in the carrier contract or charged to customer?
  is_in_contract BOOLEAN NOT NULL DEFAULT false,
  charged_to TEXT CHECK (charged_to IN ('customer', 'company', 'carrier')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for accessorials
ALTER TABLE accessorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accessorials" ON accessorials
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own accessorials" ON accessorials
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own accessorials" ON accessorials
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own accessorials" ON accessorials
  FOR DELETE USING (owner_id = auth.uid());

-- Index for load lookups
CREATE INDEX IF NOT EXISTS idx_accessorials_load_id ON accessorials(load_id);
CREATE INDEX IF NOT EXISTS idx_accessorials_owner_id ON accessorials(owner_id);

-- ============================================================================
-- 5. ADD LOAD STATUS FOR DRIVER WORKFLOW
-- ============================================================================

-- Note: The existing load status column may need to be updated to support these values.
-- Adding a separate load_status field for the driver workflow state machine.

ALTER TABLE loads ADD COLUMN IF NOT EXISTS load_status TEXT DEFAULT 'pending';

-- Add constraint for valid load statuses
DO $$ BEGIN
  ALTER TABLE loads ADD CONSTRAINT loads_load_status_check
    CHECK (load_status IN ('pending', 'loaded', 'delivered', 'storage_completed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 6. ADD UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for load_payments
DROP TRIGGER IF EXISTS update_load_payments_updated_at ON load_payments;
CREATE TRIGGER update_load_payments_updated_at
  BEFORE UPDATE ON load_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for accessorials
DROP TRIGGER IF EXISTS update_accessorials_updated_at ON accessorials;
CREATE TRIGGER update_accessorials_updated_at
  BEFORE UPDATE ON accessorials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE
-- ============================================================================
