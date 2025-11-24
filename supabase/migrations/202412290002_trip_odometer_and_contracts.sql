BEGIN;

-- Trips: odometer + status expansion
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS odometer_start numeric(12,2),
  ADD COLUMN IF NOT EXISTS odometer_end numeric(12,2),
  ADD COLUMN IF NOT EXISTS odometer_start_photo_url text,
  ADD COLUMN IF NOT EXISTS odometer_end_photo_url text,
  ADD COLUMN IF NOT EXISTS actual_miles numeric(12,2);

-- Update status check to include planned, active, completed, settled, cancelled
ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_status_check;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_status_check CHECK (
    status IN ('planned', 'active', 'en_route', 'completed', 'settled', 'cancelled')
  );

-- Loads: contract and settlement-related fields
ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS actual_cuft_loaded numeric(12,2),
  ADD COLUMN IF NOT EXISTS contract_rate_per_cuft numeric(12,2),
  ADD COLUMN IF NOT EXISTS contract_accessorials_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS contract_accessorials_shuttle numeric(12,2),
  ADD COLUMN IF NOT EXISTS contract_accessorials_stairs numeric(12,2),
  ADD COLUMN IF NOT EXISTS contract_accessorials_long_carry numeric(12,2),
  ADD COLUMN IF NOT EXISTS contract_accessorials_bulky numeric(12,2),
  ADD COLUMN IF NOT EXISTS contract_accessorials_other numeric(12,2),
  ADD COLUMN IF NOT EXISTS balance_due_on_delivery numeric(12,2),
  ADD COLUMN IF NOT EXISTS amount_collected_on_delivery numeric(12,2),
  ADD COLUMN IF NOT EXISTS amount_paid_directly_to_company numeric(12,2),
  ADD COLUMN IF NOT EXISTS extra_accessorials_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS contract_notes text,
  ADD COLUMN IF NOT EXISTS origin_arrival_at timestamptz,
  ADD COLUMN IF NOT EXISTS destination_arrival_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_photo_url text,
  ADD COLUMN IF NOT EXISTS load_report_photo_url text,
  ADD COLUMN IF NOT EXISTS delivery_report_photo_url text,
  ADD COLUMN IF NOT EXISTS delivery_photos text[],
  ADD COLUMN IF NOT EXISTS load_status text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_method_notes text,
  ADD COLUMN IF NOT EXISTS extra_shuttle numeric(12,2),
  ADD COLUMN IF NOT EXISTS extra_stairs numeric(12,2),
  ADD COLUMN IF NOT EXISTS extra_long_carry numeric(12,2),
  ADD COLUMN IF NOT EXISTS extra_packing numeric(12,2),
  ADD COLUMN IF NOT EXISTS extra_bulky numeric(12,2),
  ADD COLUMN IF NOT EXISTS extra_other numeric(12,2),
  ADD COLUMN IF NOT EXISTS storage_drop boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS storage_location_name text,
  ADD COLUMN IF NOT EXISTS storage_location_address text,
  ADD COLUMN IF NOT EXISTS storage_unit_number text,
  ADD COLUMN IF NOT EXISTS storage_move_in_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS storage_daily_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS storage_days_billed integer,
  ADD COLUMN IF NOT EXISTS storage_notes text,
  ADD COLUMN IF NOT EXISTS company_approved_exception_delivery boolean DEFAULT false;

COMMIT;

-- Trip expenses enhancements: expense_type, paid_by, receipt_photo_url (required), notes
BEGIN;
ALTER TABLE public.trip_expenses
  ADD COLUMN IF NOT EXISTS expense_type text,
  ADD COLUMN IF NOT EXISTS paid_by text,
  ADD COLUMN IF NOT EXISTS receipt_photo_url text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.trip_expenses
  ALTER COLUMN receipt_photo_url SET NOT NULL;
COMMIT;
