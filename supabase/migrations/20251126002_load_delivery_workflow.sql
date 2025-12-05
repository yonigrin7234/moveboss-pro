-- Migration: Load delivery workflow with signed documents
-- Purpose: Enable complete load workflow from loading through delivery with document capture

-- ============================================================================
-- 1. LOADING DOCUMENT FIELDS
-- ============================================================================

-- Loading report photo (single)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_report_photo TEXT;
-- Contract documents (multiple photos as JSONB array)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_documents JSONB DEFAULT '[]';
-- ============================================================================
-- 2. DELIVERY WORKFLOW FIELDS
-- ============================================================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_started_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_finished_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_location_photo TEXT;
-- ============================================================================
-- 3. SIGNED DOCUMENTS AT DELIVERY (critical for billing/compliance)
-- ============================================================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS signed_bol_photos JSONB DEFAULT '[]';
ALTER TABLE loads ADD COLUMN IF NOT EXISTS signed_inventory_photos JSONB DEFAULT '[]';
-- ============================================================================
-- 4. COLLECTION INFO
-- ============================================================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS collected_amount NUMERIC(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS collection_method TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
-- Add constraint for collection_method
DO $$ BEGIN
  ALTER TABLE loads ADD CONSTRAINT loads_collection_method_check
    CHECK (collection_method IS NULL OR collection_method IN ('cash', 'check', 'money_order', 'card', 'none'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================================
-- 5. CUSTOMER SIGNATURE (optional future feature)
-- ============================================================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS customer_signature TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS customer_name_printed TEXT;
-- ============================================================================
-- 6. UPDATE LOAD STATUS CONSTRAINT (ensure in_transit is included)
-- ============================================================================

ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_load_status_check;
DO $$ BEGIN
  ALTER TABLE loads ADD CONSTRAINT loads_load_status_check
    CHECK (load_status IN ('pending', 'accepted', 'loading', 'loaded', 'in_transit', 'delivered', 'storage_completed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================================
-- DONE
-- ============================================================================;
