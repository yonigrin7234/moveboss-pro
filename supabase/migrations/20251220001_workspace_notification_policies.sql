-- Workspace Notification Policies
-- Allows company owners to control notification settings for their workspace
-- Users can override non-mandatory settings

-- Notification types enum for type safety
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'load_request_received',
    'load_request_accepted',
    'load_request_declined',
    'rfd_critical',
    'rfd_urgent',
    'rfd_approaching',
    'compliance_expired',
    'compliance_expiring_soon',
    'driver_status_change',
    'trip_completed',
    'settlement_ready',
    'message_received'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Workspace-level notification policies
CREATE TABLE IF NOT EXISTS workspace_notification_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Policy settings
  notification_type notification_type NOT NULL,

  -- Channel settings
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false, -- Future use

  -- Mandatory flag (users cannot disable if true)
  is_mandatory BOOLEAN NOT NULL DEFAULT false,

  -- Role-based targeting (who receives this notification)
  roles_enabled TEXT[] NOT NULL DEFAULT ARRAY['owner', 'admin', 'dispatcher'],

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each company can only have one policy per notification type
  UNIQUE(company_id, notification_type)
);

-- User-level overrides (only for non-mandatory notifications)
CREATE TABLE IF NOT EXISTS user_notification_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,

  -- Override settings (null = use workspace default)
  in_app_enabled BOOLEAN,
  push_enabled BOOLEAN,
  email_enabled BOOLEAN,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only have one override per notification type per company
  UNIQUE(user_id, company_id, notification_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_notification_policies_company
  ON workspace_notification_policies(company_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_overrides_user
  ON user_notification_overrides(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_overrides_company
  ON user_notification_overrides(company_id);

-- RLS Policies for workspace_notification_policies

ALTER TABLE workspace_notification_policies ENABLE ROW LEVEL SECURITY;

-- Company owners and admins can view their company's policies
CREATE POLICY workspace_notification_policies_select ON workspace_notification_policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.company_id = workspace_notification_policies.company_id
        AND cm.user_id = auth.uid()
    )
  );

-- Only company owners can manage policies
CREATE POLICY workspace_notification_policies_insert ON workspace_notification_policies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.company_id = workspace_notification_policies.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );

CREATE POLICY workspace_notification_policies_update ON workspace_notification_policies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.company_id = workspace_notification_policies.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );

CREATE POLICY workspace_notification_policies_delete ON workspace_notification_policies
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.company_id = workspace_notification_policies.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );

-- RLS Policies for user_notification_overrides

ALTER TABLE user_notification_overrides ENABLE ROW LEVEL SECURITY;

-- Users can view their own overrides
CREATE POLICY user_notification_overrides_select ON user_notification_overrides
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can manage their own overrides
CREATE POLICY user_notification_overrides_insert ON user_notification_overrides
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_notification_overrides_update ON user_notification_overrides
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY user_notification_overrides_delete ON user_notification_overrides
  FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_policy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_notification_policies_updated_at
  BEFORE UPDATE ON workspace_notification_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_policy_updated_at();

CREATE TRIGGER user_notification_overrides_updated_at
  BEFORE UPDATE ON user_notification_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_policy_updated_at();

-- Helper function to get effective notification settings for a user
CREATE OR REPLACE FUNCTION get_effective_notification_settings(
  p_user_id UUID,
  p_company_id UUID,
  p_notification_type notification_type
)
RETURNS TABLE (
  in_app_enabled BOOLEAN,
  push_enabled BOOLEAN,
  email_enabled BOOLEAN,
  is_mandatory BOOLEAN
) AS $$
DECLARE
  v_policy workspace_notification_policies%ROWTYPE;
  v_override user_notification_overrides%ROWTYPE;
BEGIN
  -- Get workspace policy
  SELECT * INTO v_policy
  FROM workspace_notification_policies
  WHERE company_id = p_company_id
    AND notification_type = p_notification_type;

  -- If no policy exists, return defaults (all enabled, not mandatory)
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, true, true, false;
    RETURN;
  END IF;

  -- If policy is mandatory, return policy settings
  IF v_policy.is_mandatory THEN
    RETURN QUERY SELECT
      v_policy.in_app_enabled,
      v_policy.push_enabled,
      v_policy.email_enabled,
      v_policy.is_mandatory;
    RETURN;
  END IF;

  -- Get user override
  SELECT * INTO v_override
  FROM user_notification_overrides
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND notification_type = p_notification_type;

  -- If no override, return policy settings
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      v_policy.in_app_enabled,
      v_policy.push_enabled,
      v_policy.email_enabled,
      v_policy.is_mandatory;
    RETURN;
  END IF;

  -- Return merged settings (override takes precedence if not null)
  RETURN QUERY SELECT
    COALESCE(v_override.in_app_enabled, v_policy.in_app_enabled),
    COALESCE(v_override.push_enabled, v_policy.push_enabled),
    COALESCE(v_override.email_enabled, v_policy.email_enabled),
    v_policy.is_mandatory;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_effective_notification_settings TO authenticated;
