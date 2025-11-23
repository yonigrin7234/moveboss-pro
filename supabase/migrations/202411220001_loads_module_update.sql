BEGIN;

-- Migration to update loads table to new schema structure
-- This migration transforms the existing loads table to match the new specification

-- Step 1: Add new columns (without foreign keys first)
ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS load_number text,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_driver_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_truck_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_trailer_id uuid,
  ADD COLUMN IF NOT EXISTS pickup_date_new date,
  ADD COLUMN IF NOT EXISTS pickup_window_start timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_window_end timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_address_line1 text,
  ADD COLUMN IF NOT EXISTS pickup_address_line2 text,
  ADD COLUMN IF NOT EXISTS pickup_city text,
  ADD COLUMN IF NOT EXISTS pickup_state text,
  ADD COLUMN IF NOT EXISTS pickup_postal_code text,
  ADD COLUMN IF NOT EXISTS pickup_country text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS delivery_date_new date,
  ADD COLUMN IF NOT EXISTS delivery_window_start timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_window_end timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_address_line1 text,
  ADD COLUMN IF NOT EXISTS delivery_address_line2 text,
  ADD COLUMN IF NOT EXISTS delivery_city text,
  ADD COLUMN IF NOT EXISTS delivery_state text,
  ADD COLUMN IF NOT EXISTS delivery_postal_code text,
  ADD COLUMN IF NOT EXISTS delivery_country text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS cubic_feet_estimate integer,
  ADD COLUMN IF NOT EXISTS weight_lbs_estimate integer,
  ADD COLUMN IF NOT EXISTS pieces_count integer,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS packing_rate numeric(12,2),
  ADD COLUMN IF NOT EXISTS materials_rate numeric(12,2),
  ADD COLUMN IF NOT EXISTS accessorials_rate numeric(12,2);

-- Step 2: Migrate data from old columns to new columns
UPDATE public.loads
SET
  load_number = reference_number,
  company_id = COALESCE(customer_company_id, carrier_company_id),
  assigned_driver_id = driver_id,
  assigned_truck_id = truck_id,
  assigned_trailer_id = trailer_id,
  pickup_date_new = pickup_date,
  pickup_address_line1 = origin_address_line1,
  pickup_address_line2 = origin_address_line2,
  pickup_city = origin_city,
  pickup_state = origin_state,
  pickup_postal_code = origin_postal_code,
  pickup_country = COALESCE(origin_country, 'US'),
  delivery_date_new = delivery_date,
  delivery_address_line1 = destination_address_line1,
  delivery_address_line2 = destination_address_line2,
  delivery_city = destination_city,
  delivery_state = destination_state,
  delivery_postal_code = destination_postal_code,
  delivery_country = COALESCE(destination_country, 'US'),
  cubic_feet_estimate = estimated_cubic_ft,
  weight_lbs_estimate = estimated_weight_lbs,
  accessorials_rate = accessorials_total,
  service_type = 'other'
WHERE load_number IS NULL OR service_type IS NULL;

-- Step 3: Set defaults for required fields
UPDATE public.loads
SET
  load_number = COALESCE(load_number, 'LOAD-' || substring(id::text, 1, 8)),
  service_type = COALESCE(service_type, 'other')
WHERE load_number IS NULL OR service_type IS NULL;

-- Step 4: Drop old foreign key constraints first
ALTER TABLE public.loads
  DROP CONSTRAINT IF EXISTS loads_customer_company_id_fkey,
  DROP CONSTRAINT IF EXISTS loads_carrier_company_id_fkey,
  DROP CONSTRAINT IF EXISTS loads_driver_id_fkey,
  DROP CONSTRAINT IF EXISTS loads_truck_id_fkey,
  DROP CONSTRAINT IF EXISTS loads_trailer_id_fkey;

-- Step 5: Drop old columns
ALTER TABLE public.loads
  DROP COLUMN IF EXISTS reference_number,
  DROP COLUMN IF EXISTS external_ref,
  DROP COLUMN IF EXISTS customer_company_id,
  DROP COLUMN IF EXISTS carrier_company_id,
  DROP COLUMN IF EXISTS driver_id,
  DROP COLUMN IF EXISTS truck_id,
  DROP COLUMN IF EXISTS trailer_id,
  DROP COLUMN IF EXISTS origin_address_line1,
  DROP COLUMN IF EXISTS origin_address_line2,
  DROP COLUMN IF EXISTS origin_city,
  DROP COLUMN IF EXISTS origin_state,
  DROP COLUMN IF EXISTS origin_postal_code,
  DROP COLUMN IF EXISTS origin_country,
  DROP COLUMN IF EXISTS destination_address_line1,
  DROP COLUMN IF EXISTS destination_address_line2,
  DROP COLUMN IF EXISTS destination_city,
  DROP COLUMN IF EXISTS destination_state,
  DROP COLUMN IF EXISTS destination_postal_code,
  DROP COLUMN IF EXISTS destination_country,
  DROP COLUMN IF EXISTS pickup_date,
  DROP COLUMN IF EXISTS delivery_date,
  DROP COLUMN IF EXISTS estimated_cubic_ft,
  DROP COLUMN IF EXISTS estimated_weight_lbs,
  DROP COLUMN IF EXISTS accessorials_total;

-- Step 6: Rename new columns to final names
ALTER TABLE public.loads
  RENAME COLUMN pickup_date_new TO pickup_date;

ALTER TABLE public.loads
  RENAME COLUMN delivery_date_new TO delivery_date;

-- Step 7: Add new foreign key constraints
ALTER TABLE public.loads
  ADD CONSTRAINT loads_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD CONSTRAINT loads_assigned_driver_id_fkey FOREIGN KEY (assigned_driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL,
  ADD CONSTRAINT loads_assigned_truck_id_fkey FOREIGN KEY (assigned_truck_id) REFERENCES public.trucks(id) ON DELETE SET NULL,
  ADD CONSTRAINT loads_assigned_trailer_id_fkey FOREIGN KEY (assigned_trailer_id) REFERENCES public.trailers(id) ON DELETE SET NULL;

-- Step 8: Make required columns NOT NULL
ALTER TABLE public.loads
  ALTER COLUMN load_number SET NOT NULL,
  ALTER COLUMN service_type SET DEFAULT 'other';

ALTER TABLE public.loads
  ALTER COLUMN service_type SET NOT NULL;

-- Step 9: Add unique constraint on (owner_id, load_number)
ALTER TABLE public.loads
  ADD CONSTRAINT loads_owner_load_number_unique UNIQUE (owner_id, load_number);

-- Step 10: Add check constraint for service_type
ALTER TABLE public.loads
  ADD CONSTRAINT loads_service_type_check CHECK (
    service_type IN ('hhg_local', 'hhg_long_distance', 'commercial', 'storage_in', 'storage_out', 'freight', 'other')
  );

-- Step 11: Update status check constraint
ALTER TABLE public.loads
  DROP CONSTRAINT IF EXISTS loads_status_check;

ALTER TABLE public.loads
  ADD CONSTRAINT loads_status_check CHECK (
    status IN ('pending', 'assigned', 'in_transit', 'delivered', 'canceled')
  );

-- Step 12: Update default status
ALTER TABLE public.loads
  ALTER COLUMN status SET DEFAULT 'pending';

-- Step 13: Update existing status values to match new enum
UPDATE public.loads
SET status = CASE
  WHEN status = 'draft' THEN 'pending'
  WHEN status = 'planned' THEN 'pending'
  WHEN status = 'assigned' THEN 'assigned'
  WHEN status = 'in_transit' THEN 'in_transit'
  WHEN status = 'delivered' THEN 'delivered'
  WHEN status = 'cancelled' THEN 'canceled'
  ELSE 'pending'
END;

-- Step 14: Add/update indexes
DROP INDEX IF EXISTS loads_owner_id_idx;
CREATE INDEX loads_owner_id_idx ON public.loads (owner_id);
CREATE INDEX IF NOT EXISTS loads_load_number_idx ON public.loads (load_number);
CREATE INDEX IF NOT EXISTS loads_company_id_idx ON public.loads (company_id);
CREATE INDEX IF NOT EXISTS loads_assigned_driver_id_idx ON public.loads (assigned_driver_id);
CREATE INDEX IF NOT EXISTS loads_assigned_truck_id_idx ON public.loads (assigned_truck_id);
CREATE INDEX IF NOT EXISTS loads_assigned_trailer_id_idx ON public.loads (assigned_trailer_id);
CREATE INDEX IF NOT EXISTS loads_status_idx ON public.loads (status);

COMMIT;

