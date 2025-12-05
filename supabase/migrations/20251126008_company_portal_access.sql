-- ===========================================
-- COMPANY PORTAL ACCESS
-- ===========================================

-- Add access code to companies table for simple portal login
ALTER TABLE companies ADD COLUMN IF NOT EXISTS portal_access_code TEXT;
-- Create an index for fast lookup
CREATE INDEX IF NOT EXISTS idx_companies_portal_email ON companies(portal_email) WHERE portal_enabled = true;
-- Comment
COMMENT ON COLUMN companies.portal_access_code IS 'Simple access code for company portal login (should be hashed in production)';
