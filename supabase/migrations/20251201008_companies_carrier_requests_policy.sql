-- ============================================
-- Allow viewing companies that have submitted load requests
-- ============================================
-- When a broker views their Posted Jobs or Carrier Requests,
-- they need to see the carrier company details for carriers
-- who have submitted requests on their loads.

-- Add policy to allow viewing carriers who have requested your loads
DROP POLICY IF EXISTS companies_carrier_requests_select ON public.companies;
CREATE POLICY companies_carrier_requests_select
  ON public.companies
  FOR SELECT
  USING (
    -- Allow viewing carrier companies that have submitted requests on loads you own
    EXISTS (
      SELECT 1 FROM public.load_requests lr
      JOIN public.loads l ON l.id = lr.load_id
      WHERE lr.carrier_id = companies.id
      AND l.owner_id = auth.uid()
    )
  );
-- Also allow carriers to see the company that posted loads they're requesting
DROP POLICY IF EXISTS companies_load_poster_select ON public.companies;
CREATE POLICY companies_load_poster_select
  ON public.companies
  FOR SELECT
  USING (
    -- Allow viewing companies that posted loads you've requested
    EXISTS (
      SELECT 1 FROM public.load_requests lr
      JOIN public.loads l ON l.id = lr.load_id
      WHERE l.company_id = companies.id
      AND lr.carrier_owner_id = auth.uid()
    )
  );
