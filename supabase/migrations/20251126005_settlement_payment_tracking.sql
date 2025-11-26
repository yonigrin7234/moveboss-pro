-- Settlement payment tracking fields on trips
BEGIN;

-- Add settlement payment tracking to trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending';
-- Options: pending (not yet settled), review (needs owner review), approved, paid

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS settlement_reviewed_at TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS settlement_approved_at TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS settlement_paid_at TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS settlement_paid_method TEXT;
-- Options: direct_deposit, check, cash, zelle, venmo, other

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS settlement_paid_reference TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS settlement_notes TEXT;

-- Add index for filtering trips by settlement status
CREATE INDEX IF NOT EXISTS idx_trips_settlement_status ON public.trips(settlement_status);

COMMIT;
