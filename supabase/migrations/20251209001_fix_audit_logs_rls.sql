-- ============================================================================
-- FIX AUDIT LOGS RLS - Use SECURITY DEFINER for entity access checks
-- ============================================================================
-- The original RLS policy had issues because subqueries on trips/loads/etc
-- were also subject to their own RLS policies, creating nested RLS issues.
-- This migration uses SECURITY DEFINER functions to bypass RLS when checking
-- entity ownership.
-- ============================================================================

-- Helper function: Check if user has access to a trip
CREATE OR REPLACE FUNCTION public.user_can_access_trip(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips
    WHERE id = p_trip_id
    AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user has access to a load
CREATE OR REPLACE FUNCTION public.user_can_access_load(p_load_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_company_ids UUID[];
BEGIN
  -- Get user's company IDs
  SELECT ARRAY_AGG(company_id) INTO v_company_ids
  FROM company_memberships
  WHERE user_id = p_user_id;

  RETURN EXISTS (
    SELECT 1 FROM loads
    WHERE id = p_load_id
    AND (
      owner_id = p_user_id
      OR company_id = ANY(v_company_ids)
      OR assigned_carrier_id = ANY(v_company_ids)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user has access to a partnership
CREATE OR REPLACE FUNCTION public.user_can_access_partnership(p_partnership_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_company_ids UUID[];
BEGIN
  -- Get user's company IDs
  SELECT ARRAY_AGG(company_id) INTO v_company_ids
  FROM company_memberships
  WHERE user_id = p_user_id;

  RETURN EXISTS (
    SELECT 1 FROM company_partnerships
    WHERE id = p_partnership_id
    AND (
      owner_id = p_user_id
      OR owner_company_id = ANY(v_company_ids)
      OR partner_company_id = ANY(v_company_ids)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user has access to a company
CREATE OR REPLACE FUNCTION public.user_can_access_company(p_company_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_memberships
    WHERE company_id = p_company_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user can access audit log entity
CREATE OR REPLACE FUNCTION public.user_can_access_audit_entity(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  CASE p_entity_type
    WHEN 'trip' THEN
      RETURN public.user_can_access_trip(p_entity_id, p_user_id);
    WHEN 'load' THEN
      RETURN public.user_can_access_load(p_entity_id, p_user_id);
    WHEN 'partnership' THEN
      RETURN public.user_can_access_partnership(p_entity_id, p_user_id);
    WHEN 'company' THEN
      RETURN public.user_can_access_company(p_entity_id, p_user_id);
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop and recreate the SELECT policy with SECURITY DEFINER functions
DROP POLICY IF EXISTS audit_logs_select_accessible ON audit_logs;

CREATE POLICY audit_logs_select_accessible
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    -- Public visibility logs are visible to all authenticated users
    visibility = 'public'
    OR
    -- User performed the action
    performed_by_user_id = auth.uid()
    OR
    -- User is member of the company that performed the action
    performed_by_company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
    OR
    -- User has access to the entity (using SECURITY DEFINER functions)
    public.user_can_access_audit_entity(entity_type, entity_id, auth.uid())
  );

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.user_can_access_trip(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_load(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_partnership(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_company(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_audit_entity(TEXT, UUID, UUID) TO authenticated;
