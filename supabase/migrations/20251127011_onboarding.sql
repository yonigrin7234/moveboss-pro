-- ============================================
-- ENHANCED PROFILES FOR ONBOARDING
-- ============================================

-- Add onboarding fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- Role options: 'company', 'carrier', 'owner_operator', 'driver'
-- company = Moving company/broker that posts loads
-- carrier = Trucking company that hauls loads (has multiple drivers)
-- owner_operator = Independent operator (is their own driver)
-- driver = Works for a carrier

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);

-- ============================================
-- DRIVER INVITE CODES
-- ============================================

CREATE TABLE IF NOT EXISTS driver_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(8) UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 1,
  uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON driver_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_carrier ON driver_invite_codes(carrier_id);

-- RLS
ALTER TABLE driver_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Carrier owners can manage invite codes" ON driver_invite_codes;
CREATE POLICY "Carrier owners can manage invite codes"
  ON driver_invite_codes FOR ALL
  USING (
    carrier_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can read active codes for joining" ON driver_invite_codes;
CREATE POLICY "Anyone can read active codes for joining"
  ON driver_invite_codes FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- ============================================
-- FUNCTION TO GENERATE INVITE CODE
-- ============================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to increment invite uses
CREATE OR REPLACE FUNCTION increment_invite_uses(invite_code TEXT)
RETURNS void AS $$
BEGIN
  UPDATE driver_invite_codes
  SET uses = uses + 1
  WHERE code = invite_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
