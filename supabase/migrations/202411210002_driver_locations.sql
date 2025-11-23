BEGIN;

-- Driver locations table
CREATE TABLE public.driver_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  driver_id uuid NOT NULL REFERENCES public.drivers (id) ON DELETE CASCADE,
  truck_id uuid REFERENCES public.trucks (id) ON DELETE SET NULL,
  trailer_id uuid REFERENCES public.trailers (id) ON DELETE SET NULL,

  latitude double precision,
  longitude double precision,
  speed_kph numeric(8,2),
  heading_deg numeric(5,2),
  odometer_miles numeric(10,2),

  total_cubic_capacity integer,
  used_cubic integer,
  available_cubic integer,
  is_available_for_loads boolean NOT NULL DEFAULT true,

  source text
);

ALTER TABLE public.driver_locations
  ADD CONSTRAINT driver_locations_latitude_check CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE public.driver_locations
  ADD CONSTRAINT driver_locations_longitude_check CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

CREATE INDEX driver_locations_owner_id_idx ON public.driver_locations (owner_id);
CREATE INDEX driver_locations_driver_id_idx ON public.driver_locations (driver_id);
CREATE INDEX driver_locations_created_at_idx ON public.driver_locations (created_at DESC);

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY driver_locations_select_policy
  ON public.driver_locations
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY driver_locations_insert_policy
  ON public.driver_locations
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

COMMIT;

