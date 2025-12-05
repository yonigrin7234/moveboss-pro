BEGIN;
-- Trip settlements
CREATE TABLE IF NOT EXISTS public.trip_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  total_revenue numeric(14,2) NOT NULL DEFAULT 0,
  total_driver_pay numeric(14,2) NOT NULL DEFAULT 0,
  total_expenses numeric(14,2) NOT NULL DEFAULT 0,
  total_profit numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
  closed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trip_settlements_owner_id_idx ON public.trip_settlements(owner_id);
CREATE INDEX IF NOT EXISTS trip_settlements_trip_id_idx ON public.trip_settlements(trip_id);
-- Settlement line items
CREATE TABLE IF NOT EXISTS public.settlement_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settlement_id uuid NOT NULL REFERENCES public.trip_settlements(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  load_id uuid REFERENCES public.loads(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('revenue','driver_pay','fuel','tolls','expense','other')),
  description text,
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS settlement_line_items_owner_id_idx ON public.settlement_line_items(owner_id);
CREATE INDEX IF NOT EXISTS settlement_line_items_settlement_id_idx ON public.settlement_line_items(settlement_id);
-- Receivables (customer/broker)
CREATE TABLE IF NOT EXISTS public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  settlement_id uuid REFERENCES public.trip_settlements(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','void')),
  due_date date,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS receivables_owner_id_idx ON public.receivables(owner_id);
CREATE INDEX IF NOT EXISTS receivables_company_id_idx ON public.receivables(company_id);
-- Payables (drivers/vendors)
CREATE TABLE IF NOT EXISTS public.payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_type text NOT NULL DEFAULT 'driver' CHECK (payee_type IN ('driver','vendor')),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  vendor_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  settlement_id uuid REFERENCES public.trip_settlements(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','void')),
  due_date date,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payables_owner_id_idx ON public.payables(owner_id);
CREATE INDEX IF NOT EXISTS payables_driver_id_idx ON public.payables(driver_id);
-- RLS
ALTER TABLE public.trip_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
-- Policies: owner_id must match auth.uid()
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE policyname = 'trip_settlements_owner_access';
  IF NOT FOUND THEN
    CREATE POLICY trip_settlements_owner_access ON public.trip_settlements
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;

  PERFORM 1 FROM pg_policies WHERE policyname = 'settlement_line_items_owner_access';
  IF NOT FOUND THEN
    CREATE POLICY settlement_line_items_owner_access ON public.settlement_line_items
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;

  PERFORM 1 FROM pg_policies WHERE policyname = 'receivables_owner_access';
  IF NOT FOUND THEN
    CREATE POLICY receivables_owner_access ON public.receivables
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;

  PERFORM 1 FROM pg_policies WHERE policyname = 'payables_owner_access';
  IF NOT FOUND THEN
    CREATE POLICY payables_owner_access ON public.payables
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;
COMMIT;
