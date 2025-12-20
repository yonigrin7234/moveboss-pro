-- ============================================================================
-- FINANCIAL AUTO-CALCULATION TRIGGERS
-- Purpose: Automatically compute load financials when:
--   1. Load status changes to 'loaded' or 'delivered'
--   2. Payment is inserted into load_payments
--   3. Financial-related load fields are updated
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ADD MISSING CALCULATED COLUMNS
-- ============================================================================

-- Add calculated financial columns if they don't exist
ALTER TABLE loads ADD COLUMN IF NOT EXISTS base_revenue numeric(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS total_revenue numeric(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS company_owes numeric(12,2);

-- Ensure contract accessorials columns exist with consistent naming (plural form)
-- Some earlier migrations used singular form - we'll add the plural form to match the web code
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_accessorials_packing numeric(12,2);

COMMENT ON COLUMN loads.base_revenue IS 'Calculated: actual_cuft_loaded × rate_per_cuft';
COMMENT ON COLUMN loads.total_revenue IS 'Calculated: base_revenue + all accessorials + storage fees';
COMMENT ON COLUMN loads.company_owes IS 'Calculated: total_revenue - amount_collected_on_delivery - amount_paid_directly_to_company';

-- ============================================================================
-- PART 2: CREATE FINANCIAL CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_load_financials(p_load_id UUID)
RETURNS TABLE (
  base_revenue numeric,
  contract_accessorials_total numeric,
  extra_accessorials_total numeric,
  storage_total numeric,
  total_revenue numeric,
  company_owes numeric
) AS $$
DECLARE
  v_load RECORD;
  v_actual_cuft numeric;
  v_rate_per_cuft numeric;
  v_base_revenue numeric;
  v_contract_total numeric;
  v_extra_total numeric;
  v_storage_total numeric;
  v_total_revenue numeric;
  v_collected numeric;
  v_paid_to_company numeric;
  v_company_owes numeric;
BEGIN
  -- Fetch the load
  SELECT * INTO v_load FROM loads WHERE id = p_load_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Default all values to 0
  v_actual_cuft := COALESCE(v_load.actual_cuft_loaded, 0);
  -- Use contract_rate_per_cuft if set, otherwise fall back to rate_per_cuft
  v_rate_per_cuft := COALESCE(v_load.contract_rate_per_cuft, v_load.rate_per_cuft, 0);

  -- Calculate base revenue
  v_base_revenue := ROUND(v_actual_cuft * v_rate_per_cuft, 2);

  -- Calculate contract accessorials total
  v_contract_total := ROUND(
    COALESCE(v_load.contract_accessorials_stairs, 0) +
    COALESCE(v_load.contract_accessorials_shuttle, 0) +
    COALESCE(v_load.contract_accessorials_long_carry, 0) +
    COALESCE(v_load.contract_accessorials_packing, 0) +
    COALESCE(v_load.contract_accessorials_bulky, 0) +
    COALESCE(v_load.contract_accessorials_other, 0),
  2);

  -- Calculate extra accessorials total
  v_extra_total := ROUND(
    COALESCE(v_load.extra_stairs, 0) +
    COALESCE(v_load.extra_shuttle, 0) +
    COALESCE(v_load.extra_long_carry, 0) +
    COALESCE(v_load.extra_packing, 0) +
    COALESCE(v_load.extra_bulky, 0) +
    COALESCE(v_load.extra_other, 0),
  2);

  -- Calculate storage total
  v_storage_total := ROUND(
    COALESCE(v_load.storage_move_in_fee, 0) +
    (COALESCE(v_load.storage_daily_fee, 0) * COALESCE(v_load.storage_days_billed, 0)),
  2);

  -- Calculate total revenue
  v_total_revenue := ROUND(v_base_revenue + v_contract_total + v_extra_total + v_storage_total, 2);

  -- Calculate company owes
  v_collected := COALESCE(v_load.amount_collected_on_delivery, 0);
  v_paid_to_company := COALESCE(v_load.amount_paid_directly_to_company, 0);
  v_company_owes := ROUND(v_total_revenue - v_collected - v_paid_to_company, 2);

  -- Return results
  base_revenue := v_base_revenue;
  contract_accessorials_total := v_contract_total;
  extra_accessorials_total := v_extra_total;
  storage_total := v_storage_total;
  total_revenue := v_total_revenue;
  company_owes := v_company_owes;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 3: CREATE FUNCTION TO UPDATE LOAD FINANCIALS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_load_financials(p_load_id UUID)
RETURNS void AS $$
DECLARE
  v_financials RECORD;
BEGIN
  -- Calculate financials
  SELECT * INTO v_financials FROM calculate_load_financials(p_load_id);

  IF v_financials IS NOT NULL THEN
    -- Update the load with calculated values
    UPDATE loads SET
      base_revenue = v_financials.base_revenue,
      contract_accessorials_total = v_financials.contract_accessorials_total,
      extra_accessorials_total = v_financials.extra_accessorials_total,
      total_revenue = v_financials.total_revenue,
      company_owes = v_financials.company_owes,
      updated_at = NOW()
    WHERE id = p_load_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: TRIGGER ON LOAD STATUS CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_load_status_financial_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate financials when status changes to loaded or delivered
  -- or when any financial-related field changes
  IF (
    -- Status changed to loaded or delivered
    (NEW.load_status IN ('loaded', 'delivered') AND OLD.load_status IS DISTINCT FROM NEW.load_status)
    -- OR actual cuft changed
    OR OLD.actual_cuft_loaded IS DISTINCT FROM NEW.actual_cuft_loaded
    -- OR rate changed
    OR OLD.rate_per_cuft IS DISTINCT FROM NEW.rate_per_cuft
    OR OLD.contract_rate_per_cuft IS DISTINCT FROM NEW.contract_rate_per_cuft
    -- OR accessorials changed
    OR OLD.contract_accessorials_stairs IS DISTINCT FROM NEW.contract_accessorials_stairs
    OR OLD.contract_accessorials_shuttle IS DISTINCT FROM NEW.contract_accessorials_shuttle
    OR OLD.contract_accessorials_long_carry IS DISTINCT FROM NEW.contract_accessorials_long_carry
    OR OLD.contract_accessorials_packing IS DISTINCT FROM NEW.contract_accessorials_packing
    OR OLD.contract_accessorials_bulky IS DISTINCT FROM NEW.contract_accessorials_bulky
    OR OLD.contract_accessorials_other IS DISTINCT FROM NEW.contract_accessorials_other
    OR OLD.extra_stairs IS DISTINCT FROM NEW.extra_stairs
    OR OLD.extra_shuttle IS DISTINCT FROM NEW.extra_shuttle
    OR OLD.extra_long_carry IS DISTINCT FROM NEW.extra_long_carry
    OR OLD.extra_packing IS DISTINCT FROM NEW.extra_packing
    OR OLD.extra_bulky IS DISTINCT FROM NEW.extra_bulky
    OR OLD.extra_other IS DISTINCT FROM NEW.extra_other
    -- OR storage fees changed
    OR OLD.storage_move_in_fee IS DISTINCT FROM NEW.storage_move_in_fee
    OR OLD.storage_daily_fee IS DISTINCT FROM NEW.storage_daily_fee
    OR OLD.storage_days_billed IS DISTINCT FROM NEW.storage_days_billed
    -- OR collections changed
    OR OLD.amount_collected_on_delivery IS DISTINCT FROM NEW.amount_collected_on_delivery
    OR OLD.amount_paid_directly_to_company IS DISTINCT FROM NEW.amount_paid_directly_to_company
  ) THEN
    PERFORM update_load_financials(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_load_financial_update ON loads;
CREATE TRIGGER trigger_load_financial_update
  AFTER UPDATE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_load_status_financial_update();

-- ============================================================================
-- PART 5: TRIGGER ON PAYMENT INSERTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_payment_update_load()
RETURNS TRIGGER AS $$
DECLARE
  v_total_collected numeric;
BEGIN
  -- Calculate total collected from all payments for this load
  SELECT COALESCE(SUM(amount), 0) INTO v_total_collected
  FROM load_payments
  WHERE load_id = NEW.load_id
    AND payment_type IN ('customer_balance', 'cod');  -- Only count customer/COD payments

  -- Update the load's amount_collected_on_delivery
  UPDATE loads SET
    amount_collected_on_delivery = v_total_collected,
    updated_at = NOW()
  WHERE id = NEW.load_id;

  -- The load update will trigger financial recalculation via trigger_load_financial_update

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment insertions
DROP TRIGGER IF EXISTS trigger_payment_insert_update_load ON load_payments;
CREATE TRIGGER trigger_payment_insert_update_load
  AFTER INSERT ON load_payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payment_update_load();

-- Create trigger for payment updates
DROP TRIGGER IF EXISTS trigger_payment_update_load_on_update ON load_payments;
CREATE TRIGGER trigger_payment_update_load_on_update
  AFTER UPDATE ON load_payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payment_update_load();

-- Create trigger for payment deletions
CREATE OR REPLACE FUNCTION trigger_payment_delete_update_load()
RETURNS TRIGGER AS $$
DECLARE
  v_total_collected numeric;
BEGIN
  -- Calculate total collected from remaining payments for this load
  SELECT COALESCE(SUM(amount), 0) INTO v_total_collected
  FROM load_payments
  WHERE load_id = OLD.load_id
    AND payment_type IN ('customer_balance', 'cod');

  -- Update the load's amount_collected_on_delivery
  UPDATE loads SET
    amount_collected_on_delivery = v_total_collected,
    updated_at = NOW()
  WHERE id = OLD.load_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payment_delete_update_load ON load_payments;
CREATE TRIGGER trigger_payment_delete_update_load
  AFTER DELETE ON load_payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payment_delete_update_load();

-- ============================================================================
-- PART 6: DRIVER RLS POLICIES FOR LOAD_PAYMENTS
-- ============================================================================

-- Drivers need to insert payments when collecting at delivery
-- They should only be able to insert for loads assigned to their trips

-- Check if driver has access to load via trip assignment
CREATE OR REPLACE FUNCTION driver_can_access_load(p_load_id UUID, p_driver_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM trip_loads tl
    JOIN trips t ON t.id = tl.trip_id
    JOIN drivers d ON d.id = t.driver_id
    WHERE tl.load_id = p_load_id
      AND d.id = p_driver_id
      AND t.status NOT IN ('cancelled')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get driver_id for current user
CREATE OR REPLACE FUNCTION get_current_driver_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM drivers
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Drivers can insert payments for loads on their trips
DROP POLICY IF EXISTS "Drivers can insert payments for their loads" ON load_payments;
CREATE POLICY "Drivers can insert payments for their loads" ON load_payments
  FOR INSERT
  WITH CHECK (
    -- Driver must have access to the load via trip assignment
    driver_can_access_load(load_id, get_current_driver_id())
    -- Owner_id should match the load's owner
    AND owner_id = (SELECT owner_id FROM loads WHERE id = load_id)
  );

-- Policy: Drivers can view payments for loads on their trips
DROP POLICY IF EXISTS "Drivers can view payments for their loads" ON load_payments;
CREATE POLICY "Drivers can view payments for their loads" ON load_payments
  FOR SELECT
  USING (
    driver_can_access_load(load_id, get_current_driver_id())
  );

-- ============================================================================
-- PART 7: TRIP SETTLEMENT VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_trip_for_settlement(p_trip_id UUID)
RETURNS TABLE (
  can_settle boolean,
  all_delivered boolean,
  all_payments_collected boolean,
  total_loads integer,
  delivered_loads integer,
  pending_loads integer,
  total_expected_collection numeric,
  total_collected numeric,
  outstanding_balance numeric,
  issues text[]
) AS $$
DECLARE
  v_issues text[] := ARRAY[]::text[];
  v_total_loads integer;
  v_delivered integer;
  v_pending integer;
  v_expected numeric;
  v_collected numeric;
  v_outstanding numeric;
  v_load RECORD;
BEGIN
  -- Count loads by status
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE l.load_status = 'delivered'),
    COUNT(*) FILTER (WHERE l.load_status NOT IN ('delivered', 'storage_completed'))
  INTO v_total_loads, v_delivered, v_pending
  FROM trip_loads tl
  JOIN loads l ON l.id = tl.load_id
  WHERE tl.trip_id = p_trip_id;

  -- Check for undelivered loads
  IF v_pending > 0 THEN
    v_issues := array_append(v_issues, v_pending || ' load(s) not yet delivered');
  END IF;

  -- Calculate expected vs collected
  SELECT
    COALESCE(SUM(l.total_revenue), 0),
    COALESCE(SUM(l.amount_collected_on_delivery), 0) + COALESCE(SUM(l.amount_paid_directly_to_company), 0)
  INTO v_expected, v_collected
  FROM trip_loads tl
  JOIN loads l ON l.id = tl.load_id
  WHERE tl.trip_id = p_trip_id;

  v_outstanding := v_expected - v_collected;

  -- Check for outstanding balances
  IF v_outstanding > 0.01 THEN  -- Allow for rounding
    v_issues := array_append(v_issues, 'Outstanding balance of $' || ROUND(v_outstanding, 2) || ' not collected');
  END IF;

  -- Check individual loads for issues
  FOR v_load IN
    SELECT l.id, l.customer_name, l.company_owes, l.load_status
    FROM trip_loads tl
    JOIN loads l ON l.id = tl.load_id
    WHERE tl.trip_id = p_trip_id
      AND l.company_owes > 0.01
  LOOP
    v_issues := array_append(v_issues,
      'Load for ' || COALESCE(v_load.customer_name, 'Unknown') ||
      ' has $' || ROUND(v_load.company_owes, 2) || ' company owes outstanding'
    );
  END LOOP;

  -- Return results
  can_settle := array_length(v_issues, 1) IS NULL OR array_length(v_issues, 1) = 0;
  all_delivered := v_pending = 0;
  all_payments_collected := v_outstanding <= 0.01;
  total_loads := v_total_loads;
  delivered_loads := v_delivered;
  pending_loads := v_pending;
  total_expected_collection := v_expected;
  total_collected := v_collected;
  outstanding_balance := v_outstanding;
  issues := v_issues;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 8: ADD INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_loads_financial_calc ON loads(actual_cuft_loaded, rate_per_cuft, contract_rate_per_cuft);
CREATE INDEX IF NOT EXISTS idx_load_payments_load_type ON load_payments(load_id, payment_type);

-- ============================================================================
-- PART 9: INITIALIZE EXISTING LOADS (one-time backfill)
-- ============================================================================

-- Update all loads that have actual_cuft_loaded to calculate their financials
DO $$
DECLARE
  v_load_id UUID;
BEGIN
  FOR v_load_id IN
    SELECT id FROM loads
    WHERE actual_cuft_loaded IS NOT NULL
      AND actual_cuft_loaded > 0
      AND (total_revenue IS NULL OR company_owes IS NULL)
  LOOP
    PERFORM update_load_financials(v_load_id);
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION calculate_load_financials IS 'Calculate all financial values for a load';
COMMENT ON FUNCTION update_load_financials IS 'Calculate and save financial values to the loads table';
COMMENT ON FUNCTION validate_trip_for_settlement IS 'Check if a trip is ready for settlement, returns issues if any';
