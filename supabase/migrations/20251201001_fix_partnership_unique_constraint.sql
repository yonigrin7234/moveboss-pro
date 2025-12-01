-- Fix the company_partnerships unique constraint
-- The current constraint UNIQUE(company_a_id, company_b_id) doesn't allow
-- each user to have their own partnership record for the same company pair.
-- We need UNIQUE(owner_id, company_a_id, company_b_id) instead.

-- Drop the existing constraint
ALTER TABLE company_partnerships
DROP CONSTRAINT IF EXISTS unique_partnership;

-- Add the new constraint that includes owner_id
ALTER TABLE company_partnerships
ADD CONSTRAINT unique_partnership_per_owner UNIQUE(owner_id, company_a_id, company_b_id);

-- Keep the no_self_partnership constraint (already exists, just ensuring)
-- CONSTRAINT no_self_partnership CHECK (company_a_id != company_b_id)
