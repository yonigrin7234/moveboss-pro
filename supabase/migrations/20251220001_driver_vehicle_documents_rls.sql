-- ============================================================================
-- DRIVER VEHICLE DOCUMENTS RLS POLICIES
-- Purpose: Allow drivers to view trucks/trailers assigned to their trips
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: TRUCKS - Allow drivers to see trucks assigned to their trips
-- ============================================================================

DROP POLICY IF EXISTS trucks_driver_select_policy ON public.trucks;
CREATE POLICY trucks_driver_select_policy
  ON public.trucks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.drivers d ON d.id = t.driver_id
      WHERE t.truck_id = trucks.id
        AND d.auth_user_id = auth.uid()
        AND t.status NOT IN ('cancelled')
    )
  );

-- ============================================================================
-- PART 2: TRAILERS - Allow drivers to see trailers assigned to their trips
-- ============================================================================

DROP POLICY IF EXISTS trailers_driver_select_policy ON public.trailers;
CREATE POLICY trailers_driver_select_policy
  ON public.trailers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.drivers d ON d.id = t.driver_id
      WHERE t.trailer_id = trailers.id
        AND d.auth_user_id = auth.uid()
        AND t.status NOT IN ('cancelled')
    )
  );

-- ============================================================================
-- PART 3: Add driver compliance document fields if missing
-- ============================================================================

-- CDL document and expiry
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cdl_document_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cdl_expiry DATE;

-- Medical card document and expiry
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS medical_card_document_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS medical_card_expiry DATE;

-- MVR (Motor Vehicle Record) document and expiry
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS mvr_document_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS mvr_expiry DATE;

-- Drug test document and expiry
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS drug_test_document_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS drug_test_expiry DATE;

-- TWIC (Transportation Worker Identification Credential)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS twic_document_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS twic_card_expiry DATE;

-- Hazmat endorsement
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS hazmat_endorsement BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS hazmat_document_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS hazmat_expiry DATE;

COMMENT ON COLUMN drivers.cdl_document_url IS 'CDL document photo URL';
COMMENT ON COLUMN drivers.cdl_expiry IS 'CDL expiration date';
COMMENT ON COLUMN drivers.medical_card_document_url IS 'Medical card document photo URL';
COMMENT ON COLUMN drivers.medical_card_expiry IS 'Medical card expiration date';
COMMENT ON COLUMN drivers.mvr_document_url IS 'MVR report document URL';
COMMENT ON COLUMN drivers.mvr_expiry IS 'MVR report expiration date';
COMMENT ON COLUMN drivers.drug_test_document_url IS 'Drug test result document URL';
COMMENT ON COLUMN drivers.drug_test_expiry IS 'Next drug test due date';
COMMENT ON COLUMN drivers.twic_document_url IS 'TWIC card photo URL';
COMMENT ON COLUMN drivers.twic_card_expiry IS 'TWIC card expiration date';
COMMENT ON COLUMN drivers.hazmat_endorsement IS 'Has hazmat endorsement';
COMMENT ON COLUMN drivers.hazmat_document_url IS 'Hazmat endorsement document URL';
COMMENT ON COLUMN drivers.hazmat_expiry IS 'Hazmat endorsement expiration date';

-- ============================================================================
-- PART 4: Add company compliance document fields
-- ============================================================================

-- Company operating authority documents
ALTER TABLE companies ADD COLUMN IF NOT EXISTS authority_document_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS authority_expiry DATE;

-- Company cargo insurance document
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cargo_insurance_document_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cargo_insurance_expiry DATE;

-- Company liability insurance document
ALTER TABLE companies ADD COLUMN IF NOT EXISTS liability_insurance_document_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS liability_insurance_expiry DATE;

-- Company workers comp
ALTER TABLE companies ADD COLUMN IF NOT EXISTS workers_comp_document_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS workers_comp_expiry DATE;

-- UCR (Unified Carrier Registration)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ucr_document_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ucr_expiry DATE;

-- BOC-3 (Process Agent)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS boc3_document_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS boc3_filed_date DATE;

COMMENT ON COLUMN companies.authority_document_url IS 'Operating authority certificate';
COMMENT ON COLUMN companies.cargo_insurance_document_url IS 'Cargo insurance certificate';
COMMENT ON COLUMN companies.liability_insurance_document_url IS 'Liability insurance certificate';
COMMENT ON COLUMN companies.workers_comp_document_url IS 'Workers compensation certificate';
COMMENT ON COLUMN companies.ucr_document_url IS 'Unified Carrier Registration document';
COMMENT ON COLUMN companies.boc3_document_url IS 'BOC-3 Process Agent document';

-- ============================================================================
-- PART 5: Create indexes for faster driver document queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trips_truck_driver ON trips(truck_id, driver_id) WHERE status NOT IN ('cancelled');
CREATE INDEX IF NOT EXISTS idx_trips_trailer_driver ON trips(trailer_id, driver_id) WHERE status NOT IN ('cancelled');

COMMIT;
