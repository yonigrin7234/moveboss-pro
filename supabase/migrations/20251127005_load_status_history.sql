-- ============================================
-- LOAD STATUS HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS load_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  photo_url TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  updated_by_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_load_status_history_load ON load_status_history(load_id, created_at);

-- RLS
ALTER TABLE load_status_history ENABLE ROW LEVEL SECURITY;

-- Anyone involved with the load can view history
CREATE POLICY "Users can view load status history"
  ON load_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loads
      WHERE loads.id = load_status_history.load_id
      AND (loads.owner_id = auth.uid() OR loads.assigned_carrier_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      ))
    )
  );

-- Carriers can insert status updates
CREATE POLICY "Carriers can insert status updates"
  ON load_status_history FOR INSERT
  WITH CHECK (updated_by_id = auth.uid());

-- ============================================
-- FUNCTION TO INCREMENT COMPLETED LOADS
-- ============================================

CREATE OR REPLACE FUNCTION increment_platform_loads_completed(company_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE companies
  SET platform_loads_completed = COALESCE(platform_loads_completed, 0) + 1
  WHERE id = company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADD TIMESTAMP COLUMNS TO LOADS FOR TRACKING
-- ============================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_started_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loaded_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_photo_url TEXT;
