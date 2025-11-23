BEGIN;

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper trigger function for updated_at columns (if not exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Identity
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,

  -- License
  license_number text,
  license_state text,
  license_expiration date,

  -- Status
  status text NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text])),

  -- Notes
  notes text,

  -- Compensation
  compensation_type text NOT NULL DEFAULT 'per_mile_and_cubic_ft'
    CHECK (compensation_type = ANY (ARRAY['per_mile'::text, 'per_cubic_ft'::text, 'per_mile_and_cubic_ft'::text, 'daily_flat'::text, 'hourly'::text, 'custom'::text])),
  rate_per_mile numeric(10,4),
  rate_per_cubic_ft numeric(10,4),
  daily_flat_rate numeric(10,2),
  hourly_rate numeric(10,2),
  custom_comp_notes text
);

-- Drivers indexes
CREATE INDEX IF NOT EXISTS drivers_owner_id_idx ON public.drivers (owner_id);
CREATE INDEX IF NOT EXISTS drivers_status_idx ON public.drivers (status);
CREATE INDEX IF NOT EXISTS drivers_owner_name_idx ON public.drivers (owner_id, last_name, first_name);

-- Drivers RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drivers_select_policy ON public.drivers;
CREATE POLICY drivers_select_policy
  ON public.drivers
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS drivers_insert_policy ON public.drivers;
CREATE POLICY drivers_insert_policy
  ON public.drivers
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS drivers_update_policy ON public.drivers;
CREATE POLICY drivers_update_policy
  ON public.drivers
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS drivers_delete_policy ON public.drivers;
CREATE POLICY drivers_delete_policy
  ON public.drivers
  FOR DELETE
  USING (owner_id = auth.uid());

-- Drivers updated_at trigger
DROP TRIGGER IF EXISTS set_drivers_updated_at ON public.drivers;
CREATE TRIGGER set_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Trucks table
CREATE TABLE IF NOT EXISTS public.trucks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  unit_number text NOT NULL,
  year integer,
  make text,
  model text,
  vin text,
  plate_number text,
  plate_state text,

  ownership_type text NOT NULL DEFAULT 'owned'
    CHECK (ownership_type = ANY (ARRAY['owned'::text, 'leased'::text, 'rented'::text])),

  status text NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active'::text, 'maintenance'::text, 'inactive'::text])),

  cubic_capacity integer,
  gvw_lbs integer,
  notes text,

  CONSTRAINT trucks_owner_unit_number_unique UNIQUE (owner_id, unit_number)
);

-- Trucks indexes
CREATE INDEX IF NOT EXISTS trucks_owner_id_idx ON public.trucks (owner_id);

-- Trucks RLS
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trucks_select_policy ON public.trucks;
CREATE POLICY trucks_select_policy
  ON public.trucks
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS trucks_insert_policy ON public.trucks;
CREATE POLICY trucks_insert_policy
  ON public.trucks
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS trucks_update_policy ON public.trucks;
CREATE POLICY trucks_update_policy
  ON public.trucks
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS trucks_delete_policy ON public.trucks;
CREATE POLICY trucks_delete_policy
  ON public.trucks
  FOR DELETE
  USING (owner_id = auth.uid());

-- Trucks updated_at trigger
DROP TRIGGER IF EXISTS set_trucks_updated_at ON public.trucks;
CREATE TRIGGER set_trucks_updated_at
  BEFORE UPDATE ON public.trucks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Trailers table
CREATE TABLE IF NOT EXISTS public.trailers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  unit_number text NOT NULL,
  type text NOT NULL
    CHECK (type = ANY (ARRAY['53_dry_van'::text, '26_box_truck'::text, 'straight_truck'::text, 'cargo_trailer'::text, 'container'::text, 'other'::text])),

  length_ft integer,
  cubic_capacity integer,
  plate_number text,
  plate_state text,

  status text NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active'::text, 'maintenance'::text, 'inactive'::text])),

  notes text,

  CONSTRAINT trailers_owner_unit_number_unique UNIQUE (owner_id, unit_number)
);

-- Trailers indexes
CREATE INDEX IF NOT EXISTS trailers_owner_id_idx ON public.trailers (owner_id);

-- Trailers RLS
ALTER TABLE public.trailers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trailers_select_policy ON public.trailers;
CREATE POLICY trailers_select_policy
  ON public.trailers
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS trailers_insert_policy ON public.trailers;
CREATE POLICY trailers_insert_policy
  ON public.trailers
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS trailers_update_policy ON public.trailers;
CREATE POLICY trailers_update_policy
  ON public.trailers
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS trailers_delete_policy ON public.trailers;
CREATE POLICY trailers_delete_policy
  ON public.trailers
  FOR DELETE
  USING (owner_id = auth.uid());

-- Trailers updated_at trigger
DROP TRIGGER IF EXISTS set_trailers_updated_at ON public.trailers;
CREATE TRIGGER set_trailers_updated_at
  BEFORE UPDATE ON public.trailers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;

