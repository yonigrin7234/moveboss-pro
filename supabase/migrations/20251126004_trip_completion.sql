-- Trip completion fields
BEGIN;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS completion_notes TEXT;
COMMIT;
