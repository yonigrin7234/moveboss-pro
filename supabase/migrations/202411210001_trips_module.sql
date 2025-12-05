BEGIN;
-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Helper trigger function for updated_at columns
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
-- Trips table
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  trip_number text NOT NULL,
  status text NOT NULL DEFAULT 'planned',

  driver_id uuid REFERENCES public.drivers (id) ON DELETE SET NULL,
  truck_id uuid REFERENCES public.trucks (id) ON DELETE SET NULL,
  trailer_id uuid REFERENCES public.trailers (id) ON DELETE SET NULL,

  origin_city text,
  origin_state text,
  origin_postal_code text,
  destination_city text,
  destination_state text,
  destination_postal_code text,
  start_date date,
  end_date date,
  total_miles numeric(10,2),

  revenue_total numeric(12,2) NOT NULL DEFAULT 0,
  driver_pay_total numeric(12,2) NOT NULL DEFAULT 0,
  fuel_total numeric(12,2) NOT NULL DEFAULT 0,
  tolls_total numeric(12,2) NOT NULL DEFAULT 0,
  other_expenses_total numeric(12,2) NOT NULL DEFAULT 0,
  profit_total numeric(12,2) NOT NULL DEFAULT 0,

  notes text
);
ALTER TABLE public.trips
  ADD CONSTRAINT trips_owner_trip_number_unique UNIQUE (owner_id, trip_number);
CREATE INDEX trips_owner_id_idx ON public.trips (owner_id);
CREATE INDEX trips_trip_number_idx ON public.trips (trip_number);
CREATE INDEX trips_status_idx ON public.trips (status);
CREATE INDEX trips_start_date_idx ON public.trips (start_date);
CREATE INDEX trips_end_date_idx ON public.trips (end_date);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY trips_select_policy
  ON public.trips
  FOR SELECT
  USING (owner_id = auth.uid());
CREATE POLICY trips_insert_policy
  ON public.trips
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY trips_update_policy
  ON public.trips
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY trips_delete_policy
  ON public.trips
  FOR DELETE
  USING (owner_id = auth.uid());
CREATE TRIGGER set_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
-- Trip loads table
CREATE TABLE public.trip_loads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  load_id uuid NOT NULL REFERENCES public.loads (id) ON DELETE CASCADE,
  sequence_index integer NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'primary',

  CONSTRAINT trip_loads_trip_load_unique UNIQUE (trip_id, load_id)
);
CREATE INDEX trip_loads_owner_id_idx ON public.trip_loads (owner_id);
CREATE INDEX trip_loads_trip_id_idx ON public.trip_loads (trip_id);
CREATE INDEX trip_loads_load_id_idx ON public.trip_loads (load_id);
ALTER TABLE public.trip_loads ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_loads_select_policy
  ON public.trip_loads
  FOR SELECT
  USING (owner_id = auth.uid());
CREATE POLICY trip_loads_insert_policy
  ON public.trip_loads
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY trip_loads_update_policy
  ON public.trip_loads
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY trip_loads_delete_policy
  ON public.trip_loads
  FOR DELETE
  USING (owner_id = auth.uid());
CREATE TRIGGER set_trip_loads_updated_at
  BEFORE UPDATE ON public.trip_loads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
-- Trip expenses table
CREATE TABLE public.trip_expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  category text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  incurred_at date NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX trip_expenses_owner_id_idx ON public.trip_expenses (owner_id);
CREATE INDEX trip_expenses_trip_id_idx ON public.trip_expenses (trip_id);
CREATE INDEX trip_expenses_category_idx ON public.trip_expenses (category);
CREATE INDEX trip_expenses_incurred_at_idx ON public.trip_expenses (incurred_at);
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_expenses_select_policy
  ON public.trip_expenses
  FOR SELECT
  USING (owner_id = auth.uid());
CREATE POLICY trip_expenses_insert_policy
  ON public.trip_expenses
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY trip_expenses_update_policy
  ON public.trip_expenses
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY trip_expenses_delete_policy
  ON public.trip_expenses
  FOR DELETE
  USING (owner_id = auth.uid());
CREATE TRIGGER set_trip_expenses_updated_at
  BEFORE UPDATE ON public.trip_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
COMMIT;
