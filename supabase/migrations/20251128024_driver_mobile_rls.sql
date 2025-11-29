-- Migration: Driver Mobile App RLS Policies
-- Purpose: Allow drivers to access their own data via auth_user_id
-- This is needed because drivers log in with their own auth account,
-- but the data is owned by the company admin (owner_id = admin's auth.uid())

-- 1. DRIVERS - Allow drivers to see their own profile
DROP POLICY IF EXISTS drivers_self_select_policy ON public.drivers;
CREATE POLICY drivers_self_select_policy
  ON public.drivers
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- 2. TRIPS - Allow drivers to see trips assigned to them
-- First we need a function to check if the current user is the assigned driver
CREATE OR REPLACE FUNCTION public.is_trip_driver(trip_driver_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers
    WHERE id = trip_driver_id
    AND auth_user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS trips_driver_select_policy ON public.trips;
CREATE POLICY trips_driver_select_policy
  ON public.trips
  FOR SELECT
  USING (public.is_trip_driver(driver_id));

-- Allow drivers to update trip status (for start/complete actions)
DROP POLICY IF EXISTS trips_driver_update_policy ON public.trips;
CREATE POLICY trips_driver_update_policy
  ON public.trips
  FOR UPDATE
  USING (public.is_trip_driver(driver_id))
  WITH CHECK (public.is_trip_driver(driver_id));

-- 3. TRIP_LOADS - Allow drivers to see loads on their trips
DROP POLICY IF EXISTS trip_loads_driver_select_policy ON public.trip_loads;
CREATE POLICY trip_loads_driver_select_policy
  ON public.trip_loads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_loads.trip_id
      AND public.is_trip_driver(t.driver_id)
    )
  );

-- Allow drivers to update trip_loads (for updating stop status, etc.)
DROP POLICY IF EXISTS trip_loads_driver_update_policy ON public.trip_loads;
CREATE POLICY trip_loads_driver_update_policy
  ON public.trip_loads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_loads.trip_id
      AND public.is_trip_driver(t.driver_id)
    )
  );

-- 4. TRIP_EXPENSES - Allow drivers to manage expenses on their trips
DROP POLICY IF EXISTS trip_expenses_driver_select_policy ON public.trip_expenses;
CREATE POLICY trip_expenses_driver_select_policy
  ON public.trip_expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_expenses.trip_id
      AND public.is_trip_driver(t.driver_id)
    )
  );

DROP POLICY IF EXISTS trip_expenses_driver_insert_policy ON public.trip_expenses;
CREATE POLICY trip_expenses_driver_insert_policy
  ON public.trip_expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_expenses.trip_id
      AND public.is_trip_driver(t.driver_id)
    )
  );

DROP POLICY IF EXISTS trip_expenses_driver_update_policy ON public.trip_expenses;
CREATE POLICY trip_expenses_driver_update_policy
  ON public.trip_expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_expenses.trip_id
      AND public.is_trip_driver(t.driver_id)
    )
  );

-- 5. LOADS - Allow drivers to see loads on their trips
DROP POLICY IF EXISTS loads_driver_select_policy ON public.loads;
CREATE POLICY loads_driver_select_policy
  ON public.loads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_loads tl
      JOIN public.trips t ON t.id = tl.trip_id
      WHERE tl.load_id = loads.id
      AND public.is_trip_driver(t.driver_id)
    )
  );

-- Allow drivers to update loads (for status changes, delivery confirmations)
DROP POLICY IF EXISTS loads_driver_update_policy ON public.loads;
CREATE POLICY loads_driver_update_policy
  ON public.loads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_loads tl
      JOIN public.trips t ON t.id = tl.trip_id
      WHERE tl.load_id = loads.id
      AND public.is_trip_driver(t.driver_id)
    )
  );

-- 6. COMPANIES - Allow drivers to see companies for their loads
DROP POLICY IF EXISTS companies_driver_select_policy ON public.companies;
CREATE POLICY companies_driver_select_policy
  ON public.companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loads l
      JOIN public.trip_loads tl ON tl.load_id = l.id
      JOIN public.trips t ON t.id = tl.trip_id
      WHERE l.company_id = companies.id
      AND public.is_trip_driver(t.driver_id)
    )
  );

-- 7. TRIP_SETTLEMENTS - Allow drivers to see their settlements
DROP POLICY IF EXISTS trip_settlements_driver_select_policy ON public.trip_settlements;
CREATE POLICY trip_settlements_driver_select_policy
  ON public.trip_settlements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_settlements.trip_id
      AND public.is_trip_driver(t.driver_id)
    )
  );

-- 8. SETTLEMENT_LINE_ITEMS - Allow drivers to see settlement details
DROP POLICY IF EXISTS settlement_line_items_driver_select_policy ON public.settlement_line_items;
CREATE POLICY settlement_line_items_driver_select_policy
  ON public.settlement_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_settlements ts
      JOIN public.trips t ON t.id = ts.trip_id
      WHERE ts.id = settlement_line_items.settlement_id
      AND public.is_trip_driver(t.driver_id)
    )
  );

-- Note: load_documents table may not exist yet - policies will be added when table is created
-- Note: push_tokens policies are already defined in 20251128023_push_tokens.sql
-- No additional policies needed here since "Users can *" policies cover all users including drivers
