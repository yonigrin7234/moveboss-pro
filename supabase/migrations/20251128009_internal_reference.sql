-- Add internal_reference column for company's CRM/internal job numbers
-- This allows companies to cross-reference postings with their own systems

ALTER TABLE loads ADD COLUMN IF NOT EXISTS internal_reference TEXT;
CREATE INDEX IF NOT EXISTS idx_loads_internal_reference ON loads(internal_reference) WHERE internal_reference IS NOT NULL;
COMMENT ON COLUMN loads.internal_reference IS 'Company internal job/reference number for CRM cross-referencing';
