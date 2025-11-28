-- FMCSA Verification Fields for Companies
-- Stores carrier verification status from the FMCSA QCMobile API

-- Add FMCSA verification columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_verified_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_last_checked TIMESTAMPTZ;

-- FMCSA carrier data snapshot
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_legal_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_dba_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_status_code TEXT; -- 'A' = Active, 'I' = Inactive
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_allowed_to_operate BOOLEAN;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_out_of_service_date DATE;

-- Authority status ('A' = Active, 'I' = Inactive, 'N' = None)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_common_authority TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_contract_authority TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_broker_authority TEXT;

-- Insurance info (amounts in thousands, e.g., "1000" = $1,000,000)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_bipd_insurance_on_file INTEGER; -- Liability insurance in thousands
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_bipd_required_amount INTEGER; -- Minimum required in thousands
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_cargo_insurance_on_file INTEGER; -- Cargo insurance in thousands

-- Fleet info from FMCSA
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_total_drivers INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_total_power_units INTEGER;

-- Safety data
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_crash_total INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_fatal_crash INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_safety_rating TEXT;

-- Carrier operation type
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_operation_type TEXT; -- e.g., 'Interstate', 'Intrastate Non-Hazmat'

-- Full FMCSA response stored as JSON for reference
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fmcsa_raw_data JSONB;

-- Add index for verification status queries
CREATE INDEX IF NOT EXISTS idx_companies_fmcsa_verified ON companies(fmcsa_verified) WHERE fmcsa_verified = TRUE;

-- Add index for DOT number lookups
CREATE INDEX IF NOT EXISTS idx_companies_dot_number ON companies(dot_number) WHERE dot_number IS NOT NULL;

COMMENT ON COLUMN companies.fmcsa_verified IS 'Whether the company has been verified via FMCSA';
COMMENT ON COLUMN companies.fmcsa_verified_at IS 'When the company was successfully verified';
COMMENT ON COLUMN companies.fmcsa_last_checked IS 'When we last checked FMCSA for this company';
COMMENT ON COLUMN companies.fmcsa_legal_name IS 'Legal name from FMCSA records';
COMMENT ON COLUMN companies.fmcsa_allowed_to_operate IS 'Whether FMCSA shows carrier is allowed to operate';
COMMENT ON COLUMN companies.fmcsa_bipd_insurance_on_file IS 'Liability insurance amount in thousands (1000 = $1M)';
COMMENT ON COLUMN companies.fmcsa_raw_data IS 'Full FMCSA API response for reference';
