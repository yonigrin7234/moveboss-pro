-- Add permission columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_post_pickups BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_post_loads BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_carrier_requests BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_drivers BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_vehicles BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_trips BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_loads BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_view_financials BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_settlements BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permission_preset TEXT; -- 'admin', 'dispatcher', 'fleet_manager', 'accountant', 'operations', 'custom'

-- Add company_id to profiles if not exists (for team membership)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Set existing company owners as admins with full permissions
UPDATE profiles
SET
  is_admin = true,
  can_post_pickups = true,
  can_post_loads = true,
  can_manage_carrier_requests = true,
  can_manage_drivers = true,
  can_manage_vehicles = true,
  can_manage_trips = true,
  can_manage_loads = true,
  can_view_financials = true,
  can_manage_settlements = true,
  permission_preset = 'admin'
WHERE role IN ('company', 'carrier', 'owner_operator')
  AND is_admin IS NOT true;

-- Create invitations table for pending invites
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  permission_preset TEXT DEFAULT 'custom',
  permissions JSONB DEFAULT '{}',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, email)
);

-- Enable RLS on team_invitations
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Index for looking up invitations by token
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_company ON team_invitations(company_id);

-- Index for profiles company_id
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- RLS policies for team_invitations
DO $$
BEGIN
  -- Select: admins can see their company's invitations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_invitations' AND policyname = 'team_invitations_select_admin'
  ) THEN
    CREATE POLICY team_invitations_select_admin ON team_invitations
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = team_invitations.company_id
            AND p.is_admin = true
        )
      );
  END IF;

  -- Insert: admins can create invitations for their company
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_invitations' AND policyname = 'team_invitations_insert_admin'
  ) THEN
    CREATE POLICY team_invitations_insert_admin ON team_invitations
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = team_invitations.company_id
            AND p.is_admin = true
        )
      );
  END IF;

  -- Update: admins can update their company's invitations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_invitations' AND policyname = 'team_invitations_update_admin'
  ) THEN
    CREATE POLICY team_invitations_update_admin ON team_invitations
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = team_invitations.company_id
            AND p.is_admin = true
        )
      );
  END IF;

  -- Delete: admins can delete their company's invitations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_invitations' AND policyname = 'team_invitations_delete_admin'
  ) THEN
    CREATE POLICY team_invitations_delete_admin ON team_invitations
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = team_invitations.company_id
            AND p.is_admin = true
        )
      );
  END IF;

  -- Select by token: anyone can look up invitation by token (for accepting)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_invitations' AND policyname = 'team_invitations_select_by_token'
  ) THEN
    CREATE POLICY team_invitations_select_by_token ON team_invitations
      FOR SELECT USING (true); -- Token lookup handled in application
  END IF;
END $$;
