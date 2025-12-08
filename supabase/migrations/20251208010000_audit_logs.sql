-- ============================================================================
-- MOVEBOSS AUDIT LOGS - Unified Activity History
-- ============================================================================
-- A polymorphic audit logging system for tracking changes to key entities:
-- trips, loads, partnerships, companies, etc.
-- ============================================================================

-- Create the audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,

  -- What was changed
  entity_type TEXT NOT NULL,  -- 'trip' | 'load' | 'partnership' | 'company'
  entity_id UUID NOT NULL,    -- ID from the related table

  -- What action was performed
  action TEXT NOT NULL,       -- 'status_changed', 'driver_assigned', 'posted_to_marketplace', etc.

  -- Who performed the action
  performed_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  performed_by_company_id UUID REFERENCES public.companies(id),

  -- Context
  source TEXT NOT NULL DEFAULT 'web',  -- 'web' | 'mobile' | 'system'
  visibility TEXT NOT NULL DEFAULT 'partner' CHECK (visibility IN ('internal', 'partner', 'public')),

  -- Change details
  previous_value JSONB,       -- Snapshot of fields before change
  new_value JSONB,            -- Snapshot of fields after change
  metadata JSONB,             -- Additional context (e.g., old/new driver names, status labels)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_performer ON audit_logs(performed_by_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_company ON audit_logs(performed_by_company_id, created_at DESC);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Policy: Allow INSERT for authenticated users (only their own actions)
DROP POLICY IF EXISTS audit_logs_insert_own ON audit_logs;
CREATE POLICY audit_logs_insert_own
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (performed_by_user_id = auth.uid());

-- Policy: Allow SELECT for users who have access to the entity
-- This uses a function to check entity access based on company membership
DROP POLICY IF EXISTS audit_logs_select_accessible ON audit_logs;
CREATE POLICY audit_logs_select_accessible
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    -- Public visibility logs are visible to all
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
    -- User has access to the entity (trip/load owned by user or their company)
    CASE entity_type
      WHEN 'trip' THEN
        entity_id IN (
          SELECT id FROM trips WHERE owner_id = auth.uid()
        )
      WHEN 'load' THEN
        entity_id IN (
          SELECT id FROM loads
          WHERE owner_id = auth.uid()
          OR company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid())
          OR assigned_carrier_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid())
        )
      WHEN 'partnership' THEN
        entity_id IN (
          SELECT id FROM company_partnerships WHERE owner_id = auth.uid()
        )
      WHEN 'company' THEN
        entity_id IN (
          SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
        )
      ELSE FALSE
    END
  );

-- ============================================================================
-- HELPER FUNCTION: Get user's display name for audit logs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_audit_performer_name(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT COALESCE(full_name, email, 'Unknown User')
  INTO v_name
  FROM profiles
  WHERE id = p_user_id;

  RETURN COALESCE(v_name, 'Unknown User');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE audit_logs IS 'Unified audit log for tracking changes to key entities (trips, loads, partnerships, companies)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity: trip, load, partnership, company';
COMMENT ON COLUMN audit_logs.entity_id IS 'UUID of the entity being tracked';
COMMENT ON COLUMN audit_logs.action IS 'Semantic action name: status_changed, driver_assigned, posted_to_marketplace, etc.';
COMMENT ON COLUMN audit_logs.visibility IS 'Who can see this log: internal (owner only), partner (owner + partners), public (all authenticated)';
COMMENT ON COLUMN audit_logs.previous_value IS 'JSON snapshot of changed fields before the action';
COMMENT ON COLUMN audit_logs.new_value IS 'JSON snapshot of changed fields after the action';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context like human-readable labels, driver names, etc.';
