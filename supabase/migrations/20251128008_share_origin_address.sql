-- Add share_origin_address column for pickup postings
-- When true, full origin address is shared with carrier once matched
-- When false, only city/state/zip are shared until pickup confirmed

ALTER TABLE loads ADD COLUMN IF NOT EXISTS share_origin_address BOOLEAN DEFAULT true;

COMMENT ON COLUMN loads.share_origin_address IS 'If true, full origin address shared with carrier once matched. If false, only city/state/zip visible until pickup.';
