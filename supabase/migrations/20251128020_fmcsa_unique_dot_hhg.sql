-- FMCSA Verification: Unique DOT constraint and HHG authorization
--
-- This migration:
-- 1. Adds a unique constraint on DOT numbers for verified workspace companies
--    (prevents multiple companies from claiming the same DOT)
-- 2. Adds HHG (Household Goods) authorization field

-- Add HHG authorization field
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_hhg_authorized BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_cargo_carried JSONB; -- Array of cargo types from FMCSA

COMMENT ON COLUMN companies.fmcsa_hhg_authorized IS 'Whether carrier is authorized to haul Household Goods (HHG)';
COMMENT ON COLUMN companies.fmcsa_cargo_carried IS 'Array of cargo types the carrier is authorized to haul';

-- Create a partial unique index on DOT number for verified workspace companies
-- This allows:
-- - Multiple companies to have the same DOT if they're not verified (e.g., partner companies)
-- - Only ONE workspace company can verify with a given DOT number
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_unique_verified_dot
ON companies(dot_number)
WHERE dot_number IS NOT NULL
  AND fmcsa_verified = TRUE
  AND is_workspace_company = TRUE;

-- Add a function to check DOT availability before verification
CREATE OR REPLACE FUNCTION check_dot_availability(
  p_dot_number TEXT,
  p_company_id UUID
) RETURNS TABLE (
  available BOOLEAN,
  claimed_by_company_id UUID,
  claimed_by_company_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    NOT EXISTS(
      SELECT 1 FROM companies
      WHERE dot_number = p_dot_number
        AND fmcsa_verified = TRUE
        AND is_workspace_company = TRUE
        AND id != p_company_id
    ) as available,
    c.id as claimed_by_company_id,
    c.name as claimed_by_company_name
  FROM companies c
  WHERE c.dot_number = p_dot_number
    AND c.fmcsa_verified = TRUE
    AND c.is_workspace_company = TRUE
    AND c.id != p_company_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
