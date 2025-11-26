-- Migration: Separate loading report and origin paperwork photos
-- Purpose: Add dedicated columns for loading report (single) and origin paperwork (multiple)

-- Loading report photo (single photo of the loading report document)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_report_photo TEXT;

-- Origin paperwork photos (multiple: BOL pages, inventory, etc.)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS origin_paperwork_photos JSONB DEFAULT '[]';
