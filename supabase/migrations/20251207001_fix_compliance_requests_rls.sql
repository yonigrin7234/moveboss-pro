-- ============================================
-- FIX COMPLIANCE REQUESTS RLS POLICY
-- ============================================
-- The existing RLS policies only allow users who directly own
-- the requesting_company_id or carrier_id. But partnership owners
-- should also be able to view compliance requests for their partnerships.

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Partnership owners can view compliance requests" ON compliance_requests;
DROP POLICY IF EXISTS "Partnership owners can create compliance requests" ON compliance_requests;
DROP POLICY IF EXISTS "Partnership owners can update compliance requests" ON compliance_requests;

-- Add policy for partnership owners to view compliance requests
CREATE POLICY "Partnership owners can view compliance requests"
  ON compliance_requests FOR SELECT
  USING (
    partnership_id IN (SELECT id FROM company_partnerships WHERE owner_id = auth.uid())
  );

-- Add policy for partnership owners to create compliance requests
CREATE POLICY "Partnership owners can create compliance requests"
  ON compliance_requests FOR INSERT
  WITH CHECK (
    partnership_id IN (SELECT id FROM company_partnerships WHERE owner_id = auth.uid())
  );

-- Add policy for partnership owners to update compliance requests
CREATE POLICY "Partnership owners can update compliance requests"
  ON compliance_requests FOR UPDATE
  USING (
    partnership_id IN (SELECT id FROM company_partnerships WHERE owner_id = auth.uid())
  );
