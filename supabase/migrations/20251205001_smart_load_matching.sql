-- =====================================================
-- SMART LOAD MATCHING - DATABASE SCHEMA
-- =====================================================
-- Adds support for:
-- 1. Driver visibility settings (location sharing, capacity posting)
-- 2. Trip location tracking and visibility overrides
-- 3. Enhanced driver_locations for mobile GPS tracking
-- 4. Load suggestions table for matching engine results
-- 5. Company matching preferences
-- =====================================================

BEGIN;

-- ===========================================
-- PART 1: DRIVER VISIBILITY SETTINGS
-- ===========================================

-- Add visibility settings to drivers table
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS
  location_sharing_enabled boolean DEFAULT false;

ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS
  auto_post_capacity boolean DEFAULT false;

ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS
  capacity_visibility text DEFAULT 'private';

-- Add constraint for capacity_visibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drivers_capacity_visibility_check'
  ) THEN
    ALTER TABLE public.drivers ADD CONSTRAINT drivers_capacity_visibility_check
      CHECK (capacity_visibility IN ('private', 'partners_only', 'public'));
  END IF;
END $$;

COMMENT ON COLUMN public.drivers.location_sharing_enabled IS 'Whether this driver shares GPS location for load matching';
COMMENT ON COLUMN public.drivers.auto_post_capacity IS 'Whether to automatically post available capacity';
COMMENT ON COLUMN public.drivers.capacity_visibility IS 'private=owner only sees suggestions, partners_only=partner companies can see capacity, public=marketplace visible';

-- ===========================================
-- PART 2: TRIP LOCATION & VISIBILITY FIELDS
-- ===========================================

-- Add location tracking and visibility override to trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  share_location boolean DEFAULT null;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  share_capacity boolean DEFAULT null;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  trip_capacity_visibility text DEFAULT null;

-- Add constraint for trip capacity visibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trips_capacity_visibility_check'
  ) THEN
    ALTER TABLE public.trips ADD CONSTRAINT trips_capacity_visibility_check
      CHECK (trip_capacity_visibility IS NULL OR trip_capacity_visibility IN ('private', 'partners_only', 'public'));
  END IF;
END $$;

-- Current location tracking (updated by mobile app)
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  current_location_lat numeric(10,6) DEFAULT null;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  current_location_lng numeric(10,6) DEFAULT null;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  current_location_city text DEFAULT null;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  current_location_state text DEFAULT null;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  current_location_updated_at timestamptz DEFAULT null;

-- Capacity tracking
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  remaining_capacity_cuft numeric(10,2) DEFAULT null;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  expected_completion_date date DEFAULT null;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS
  return_route_preference text[] DEFAULT null;

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_trips_current_location
  ON public.trips(current_location_state, current_location_city)
  WHERE current_location_lat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trips_sharing_enabled
  ON public.trips(owner_id, share_location)
  WHERE share_location = true;

COMMENT ON COLUMN public.trips.share_location IS 'Trip-level override for location sharing (null = use driver default)';
COMMENT ON COLUMN public.trips.share_capacity IS 'Trip-level override for capacity posting (null = use driver default)';
COMMENT ON COLUMN public.trips.return_route_preference IS 'Array of preferred states for return loads';
COMMENT ON COLUMN public.trips.remaining_capacity_cuft IS 'Remaining trailer capacity in cubic feet';

-- ===========================================
-- PART 3: ENHANCE DRIVER_LOCATIONS TABLE
-- ===========================================

-- Add additional tracking fields to driver_locations
ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;

ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS
  city text;

ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS
  state text;

ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS
  zip text;

ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS
  accuracy_meters numeric(8,2);

ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS
  altitude_meters numeric(8,2);

ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS
  battery_level numeric(3,2);

ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS
  is_charging boolean;

ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS
  device_timestamp timestamptz;

-- Better indexes for driver_locations
CREATE INDEX IF NOT EXISTS idx_driver_locations_trip_id
  ON public.driver_locations(trip_id);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_recent
  ON public.driver_locations(driver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_locations_state_city
  ON public.driver_locations(state, city)
  WHERE state IS NOT NULL;

-- ===========================================
-- PART 4: LOAD SUGGESTIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.load_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who this suggestion is for
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,

  -- The suggested load (from loads table with posting_status='posted')
  load_id uuid NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,

  -- Suggestion classification
  suggestion_type text NOT NULL CHECK (suggestion_type IN (
    'near_delivery',      -- Load pickup is near driver's delivery destination
    'backhaul',           -- Load goes back toward driver's home base
    'capacity_fit',       -- Load perfectly fits remaining capacity
    'high_profit',        -- Exceptionally profitable opportunity
    'partner_load'        -- From a known partner company
  )),

  -- Calculated metrics at time of suggestion
  distance_to_pickup_miles numeric(10,2),
  load_miles numeric(10,2),
  total_miles numeric(10,2),

  profit_estimate numeric(12,2),
  profit_per_mile numeric(10,4),

  revenue_estimate numeric(12,2),
  driver_cost_estimate numeric(12,2),
  fuel_cost_estimate numeric(12,2),

  capacity_fit_percent numeric(5,2),

  -- Match scoring (0-100)
  match_score numeric(5,2) NOT NULL,
  score_breakdown jsonb,

  -- Status tracking
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',     -- New, not yet viewed
    'viewed',      -- Owner has seen it
    'interested',  -- Owner marked as interested
    'claimed',     -- Owner claimed the load
    'dismissed',   -- Owner dismissed
    'expired'      -- Load no longer available
  )),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  actioned_at timestamptz,
  expires_at timestamptz,

  -- Prevent duplicate suggestions
  UNIQUE(trip_id, load_id)
);

-- Indexes for load_suggestions
CREATE INDEX IF NOT EXISTS idx_load_suggestions_owner ON public.load_suggestions(owner_id);
CREATE INDEX IF NOT EXISTS idx_load_suggestions_company ON public.load_suggestions(company_id);
CREATE INDEX IF NOT EXISTS idx_load_suggestions_trip ON public.load_suggestions(trip_id);
CREATE INDEX IF NOT EXISTS idx_load_suggestions_driver ON public.load_suggestions(driver_id);
CREATE INDEX IF NOT EXISTS idx_load_suggestions_status ON public.load_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_load_suggestions_score ON public.load_suggestions(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_load_suggestions_pending ON public.load_suggestions(owner_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_load_suggestions_load ON public.load_suggestions(load_id);

-- Enable RLS
ALTER TABLE public.load_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for load_suggestions
CREATE POLICY load_suggestions_select_policy
  ON public.load_suggestions
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY load_suggestions_insert_policy
  ON public.load_suggestions
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY load_suggestions_update_policy
  ON public.load_suggestions
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY load_suggestions_delete_policy
  ON public.load_suggestions
  FOR DELETE
  USING (owner_id = auth.uid());

COMMENT ON TABLE public.load_suggestions IS 'AI-generated load suggestions based on driver location and capacity';

-- ===========================================
-- PART 5: COMPANY MATCHING SETTINGS
-- ===========================================

CREATE TABLE IF NOT EXISTS public.company_matching_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Matching criteria
  min_profit_per_mile numeric(10,4) DEFAULT 1.00,
  max_deadhead_miles numeric(10,2) DEFAULT 150,
  min_match_score numeric(5,2) DEFAULT 50,

  -- Regional preferences
  preferred_return_states text[] DEFAULT '{}',
  excluded_states text[] DEFAULT '{}',

  -- Capacity preferences
  min_capacity_utilization_percent numeric(5,2) DEFAULT 30,
  max_capacity_utilization_percent numeric(5,2) DEFAULT 100,

  -- Notification preferences
  notification_preference text DEFAULT 'push_and_dashboard'
    CHECK (notification_preference IN ('dashboard_only', 'push_and_dashboard', 'email_digest', 'disabled')),

  -- Auto-capacity posting
  auto_post_capacity_enabled boolean DEFAULT false,
  auto_post_min_capacity_cuft numeric(10,2) DEFAULT 500,

  -- Default visibility for new drivers/trips
  default_location_sharing boolean DEFAULT false,
  default_capacity_visibility text DEFAULT 'private'
    CHECK (default_capacity_visibility IN ('private', 'partners_only', 'public')),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for company_matching_settings
CREATE INDEX IF NOT EXISTS idx_company_matching_settings_owner
  ON public.company_matching_settings(owner_id);

-- Enable RLS
ALTER TABLE public.company_matching_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY company_matching_settings_select_policy
  ON public.company_matching_settings
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY company_matching_settings_insert_policy
  ON public.company_matching_settings
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY company_matching_settings_update_policy
  ON public.company_matching_settings
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY company_matching_settings_delete_policy
  ON public.company_matching_settings
  FOR DELETE
  USING (owner_id = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_company_matching_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_company_matching_settings_timestamp ON public.company_matching_settings;
CREATE TRIGGER update_company_matching_settings_timestamp
  BEFORE UPDATE ON public.company_matching_settings
  FOR EACH ROW EXECUTE FUNCTION update_company_matching_settings_timestamp();

COMMENT ON TABLE public.company_matching_settings IS 'Company-level preferences for smart load matching';

-- ===========================================
-- PART 6: ADD AUTO-GENERATED FIELDS TO LOADS
-- ===========================================

-- Track auto-generated capacity listings
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS
  auto_generated boolean DEFAULT false;

ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS
  source_trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;

ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS
  source_driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_loads_auto_generated
  ON public.loads(auto_generated) WHERE auto_generated = true;

CREATE INDEX IF NOT EXISTS idx_loads_source_trip
  ON public.loads(source_trip_id) WHERE source_trip_id IS NOT NULL;

-- ===========================================
-- PART 7: HELPER FUNCTION FOR REMAINING CAPACITY
-- ===========================================

-- Function to calculate remaining capacity for a trip
CREATE OR REPLACE FUNCTION calculate_trip_remaining_capacity(p_trip_id uuid)
RETURNS numeric AS $$
DECLARE
  v_trailer_capacity numeric;
  v_loaded_cuft numeric;
BEGIN
  -- Get trailer capacity
  SELECT COALESCE(t.cubic_capacity, 0)
  INTO v_trailer_capacity
  FROM trips tr
  LEFT JOIN trailers t ON t.id = tr.trailer_id
  WHERE tr.id = p_trip_id;

  -- Get total loaded cubic feet from trip loads
  SELECT COALESCE(SUM(l.actual_cuft_loaded), COALESCE(SUM(l.cubic_feet), 0))
  INTO v_loaded_cuft
  FROM trip_loads tl
  JOIN loads l ON l.id = tl.load_id
  WHERE tl.trip_id = p_trip_id
    AND l.load_status NOT IN ('delivered', 'cancelled');

  RETURN GREATEST(0, v_trailer_capacity - COALESCE(v_loaded_cuft, 0));
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- PART 8: DRIVER MOBILE APP RLS POLICIES
-- ===========================================

-- Allow drivers to update their location in driver_locations
DROP POLICY IF EXISTS driver_locations_driver_insert_policy ON public.driver_locations;
CREATE POLICY driver_locations_driver_insert_policy
  ON public.driver_locations
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = driver_id
      AND d.auth_user_id = auth.uid()
    )
  );

-- Allow drivers to view their own location history
DROP POLICY IF EXISTS driver_locations_driver_select_policy ON public.driver_locations;
CREATE POLICY driver_locations_driver_select_policy
  ON public.driver_locations
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = driver_id
      AND d.auth_user_id = auth.uid()
    )
  );

-- Allow drivers to update trip current location
DROP POLICY IF EXISTS trips_driver_location_update_policy ON public.trips;
CREATE POLICY trips_driver_location_update_policy
  ON public.trips
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = driver_id
      AND d.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = driver_id
      AND d.auth_user_id = auth.uid()
    )
  );

COMMIT;
