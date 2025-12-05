-- Fix company_type check constraint
-- The constraint should allow: 'customer', 'carrier', 'both'

-- Drop the existing constraint if it exists
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_company_type_check;
-- Add the correct constraint
ALTER TABLE companies ADD CONSTRAINT companies_company_type_check
  CHECK (company_type IN ('customer', 'carrier', 'both'));
-- Update any invalid values to 'customer' (safe default)
UPDATE companies
SET company_type = 'customer'
WHERE company_type IS NULL
   OR company_type NOT IN ('customer', 'carrier', 'both');
