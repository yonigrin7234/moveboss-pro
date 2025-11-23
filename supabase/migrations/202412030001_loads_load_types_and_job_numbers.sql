BEGIN;

ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS load_type text,
  ADD COLUMN IF NOT EXISTS job_number text,
  ADD COLUMN IF NOT EXISTS pickup_contact_name text,
  ADD COLUMN IF NOT EXISTS pickup_contact_phone text,
  ADD COLUMN IF NOT EXISTS loading_contact_name text,
  ADD COLUMN IF NOT EXISTS loading_contact_phone text,
  ADD COLUMN IF NOT EXISTS loading_contact_email text,
  ADD COLUMN IF NOT EXISTS loading_address_line1 text,
  ADD COLUMN IF NOT EXISTS loading_address_line2 text,
  ADD COLUMN IF NOT EXISTS loading_city text,
  ADD COLUMN IF NOT EXISTS loading_state text,
  ADD COLUMN IF NOT EXISTS loading_postal_code text,
  ADD COLUMN IF NOT EXISTS dropoff_postal_code text,
  ADD COLUMN IF NOT EXISTS dropoff_city text,
  ADD COLUMN IF NOT EXISTS dropoff_state text,
  ADD COLUMN IF NOT EXISTS dropoff_address_line1 text,
  ADD COLUMN IF NOT EXISTS dropoff_address_line2 text,
  ADD COLUMN IF NOT EXISTS cubic_feet numeric(12,2),
  ADD COLUMN IF NOT EXISTS rate_per_cuft numeric(12,2),
  ADD COLUMN IF NOT EXISTS linehaul_amount numeric(14,2);

UPDATE public.loads
SET load_type = COALESCE(load_type, 'company_load');

UPDATE public.loads
SET dropoff_postal_code = COALESCE(dropoff_postal_code, delivery_postal_code),
    dropoff_city = COALESCE(dropoff_city, delivery_city),
    dropoff_state = COALESCE(dropoff_state, delivery_state),
    dropoff_address_line1 = COALESCE(dropoff_address_line1, delivery_address_line1),
    dropoff_address_line2 = COALESCE(dropoff_address_line2, delivery_address_line2)
WHERE dropoff_postal_code IS NULL
   OR dropoff_city IS NULL
   OR dropoff_state IS NULL
   OR dropoff_address_line1 IS NULL
   OR dropoff_address_line2 IS NULL;

UPDATE public.loads
SET cubic_feet = COALESCE(cubic_feet, cubic_feet_estimate::numeric),
    rate_per_cuft = COALESCE(rate_per_cuft, NULL),
    linehaul_amount = COALESCE(linehaul_amount, linehaul_rate, total_rate)
WHERE cubic_feet IS NULL OR rate_per_cuft IS NULL OR linehaul_amount IS NULL;

UPDATE public.loads
SET job_number = COALESCE(job_number, 'JOB-' || to_char(current_timestamp, 'YYMMDDHH24MISS') || '-' || lpad((floor(random()*1000))::text, 3, '0'))
WHERE job_number IS NULL;

ALTER TABLE public.loads
  ALTER COLUMN load_type SET NOT NULL,
  ALTER COLUMN job_number SET NOT NULL;

ALTER TABLE public.loads
  ALTER COLUMN load_number DROP NOT NULL;

ALTER TABLE public.loads
  ALTER COLUMN job_number SET DEFAULT ('JOB-' || to_char(clock_timestamp(), 'YYMMDDHH24MISS') || '-' || lpad((floor(random()*1000))::text, 3, '0'));

ALTER TABLE public.loads
  ADD CONSTRAINT loads_load_type_check CHECK (load_type IN ('company_load','live_load'));

CREATE UNIQUE INDEX IF NOT EXISTS loads_job_number_key ON public.loads(job_number);

UPDATE public.loads
SET delivery_postal_code = dropoff_postal_code,
    delivery_city = dropoff_city,
    delivery_state = dropoff_state
WHERE dropoff_postal_code IS NOT NULL;

COMMIT;
