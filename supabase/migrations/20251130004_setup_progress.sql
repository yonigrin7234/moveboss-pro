-- ============================================
-- SETUP PROGRESS TABLE
-- Tracks onboarding checklist progress per company
-- ============================================

-- Create setup_progress table
CREATE TABLE IF NOT EXISTS setup_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Core checklist items (applicable to most roles)
  first_driver_added BOOLEAN DEFAULT FALSE,
  first_vehicle_added BOOLEAN DEFAULT FALSE,
  first_partner_added BOOLEAN DEFAULT FALSE,
  first_load_created BOOLEAN DEFAULT FALSE,
  compliance_verified BOOLEAN DEFAULT FALSE,

  -- Timestamps for when each was completed
  first_driver_added_at TIMESTAMPTZ,
  first_vehicle_added_at TIMESTAMPTZ,
  first_partner_added_at TIMESTAMPTZ,
  first_load_created_at TIMESTAMPTZ,
  compliance_verified_at TIMESTAMPTZ,

  -- Overall progress
  checklist_dismissed BOOLEAN DEFAULT FALSE,
  checklist_dismissed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id)
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_setup_progress_company ON setup_progress(company_id);

-- Function to auto-create setup_progress when company is created
CREATE OR REPLACE FUNCTION create_setup_progress_for_company()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO setup_progress (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create setup_progress
DROP TRIGGER IF EXISTS trigger_create_setup_progress ON companies;
CREATE TRIGGER trigger_create_setup_progress
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_setup_progress_for_company();

-- Create setup_progress for existing companies
INSERT INTO setup_progress (company_id)
SELECT id FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM setup_progress WHERE setup_progress.company_id = companies.id
)
ON CONFLICT (company_id) DO NOTHING;

-- RLS Policies
ALTER TABLE setup_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own company's setup progress
CREATE POLICY "Users can view own company setup progress"
  ON setup_progress FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  );

-- Users can update their own company's setup progress
CREATE POLICY "Users can update own company setup progress"
  ON setup_progress FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  );

-- Users can insert setup progress for their own company
CREATE POLICY "Users can insert own company setup progress"
  ON setup_progress FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  );

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON setup_progress TO authenticated;
