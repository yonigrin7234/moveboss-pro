-- ============================================
-- LOAD PHOTOS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS load_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE NOT NULL,

  -- Who uploaded
  uploaded_by_id UUID REFERENCES profiles(id) NOT NULL,
  company_id UUID REFERENCES companies(id),

  -- Photo type
  photo_type TEXT NOT NULL, -- 'loading', 'loaded', 'delivery', 'damage', 'other'

  -- File info
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,

  -- Metadata
  caption TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  taken_at TIMESTAMPTZ,

  -- Linked to status update
  status_history_id UUID REFERENCES load_status_history(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_load_photos_load ON load_photos(load_id);
CREATE INDEX IF NOT EXISTS idx_load_photos_type ON load_photos(load_id, photo_type);

-- RLS
ALTER TABLE load_photos ENABLE ROW LEVEL SECURITY;

-- Users involved with load can view photos
DROP POLICY IF EXISTS "Users can view load photos" ON load_photos;
CREATE POLICY "Users can view load photos"
  ON load_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loads
      WHERE loads.id = load_photos.load_id
      AND (
        loads.owner_id = auth.uid()
        OR loads.assigned_carrier_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
      )
    )
  );

-- Users can insert photos for their loads
DROP POLICY IF EXISTS "Users can insert load photos" ON load_photos;
CREATE POLICY "Users can insert load photos"
  ON load_photos FOR INSERT
  WITH CHECK (uploaded_by_id = auth.uid());

-- Users can delete their own photos
DROP POLICY IF EXISTS "Users can delete own photos" ON load_photos;
CREATE POLICY "Users can delete own photos"
  ON load_photos FOR DELETE
  USING (uploaded_by_id = auth.uid());

-- ============================================
-- UPDATE LOADS TABLE FOR PHOTO COUNTS
-- ============================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_photo_count INTEGER DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_photo_count INTEGER DEFAULT 0;

-- ============================================
-- FUNCTION TO UPDATE PHOTO COUNTS
-- ============================================

CREATE OR REPLACE FUNCTION update_load_photo_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE loads
    SET
      loading_photo_count = (
        SELECT COUNT(*) FROM load_photos
        WHERE load_id = OLD.load_id AND photo_type IN ('loading', 'loaded')
      ),
      delivery_photo_count = (
        SELECT COUNT(*) FROM load_photos
        WHERE load_id = OLD.load_id AND photo_type = 'delivery'
      )
    WHERE id = OLD.load_id;
    RETURN OLD;
  ELSE
    UPDATE loads
    SET
      loading_photo_count = (
        SELECT COUNT(*) FROM load_photos
        WHERE load_id = NEW.load_id AND photo_type IN ('loading', 'loaded')
      ),
      delivery_photo_count = (
        SELECT COUNT(*) FROM load_photos
        WHERE load_id = NEW.load_id AND photo_type = 'delivery'
      )
    WHERE id = NEW.load_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_photo_counts_trigger ON load_photos;
CREATE TRIGGER update_photo_counts_trigger
  AFTER INSERT OR DELETE ON load_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_load_photo_counts();

-- ============================================
-- COMPANY PHOTO REQUIREMENTS (OPTIONAL)
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_loading_photos BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_delivery_photos BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS min_loading_photos INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS min_delivery_photos INTEGER DEFAULT 0;
