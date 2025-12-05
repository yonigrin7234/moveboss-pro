-- Pre-existing damage documentation for loads
-- Allows drivers to document items that were already damaged before loading

ALTER TABLE loads ADD COLUMN IF NOT EXISTS pre_existing_damages JSONB DEFAULT '[]';
-- Add comment for documentation
COMMENT ON COLUMN loads.pre_existing_damages IS 'Array of damage items: [{id, sticker_number, item_description, damage_description, photo_url, documented_at}]';
