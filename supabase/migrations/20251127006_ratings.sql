-- ============================================
-- RATINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE NOT NULL,
  rater_company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  rated_company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  rater_type TEXT NOT NULL CHECK (rater_type IN ('shipper', 'carrier')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Unique constraint: one rating per load per rater
CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_unique ON ratings(load_id, rater_company_id);
-- Index for looking up ratings by rated company
CREATE INDEX IF NOT EXISTS idx_ratings_rated_company ON ratings(rated_company_id);
-- RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
-- Anyone can view ratings (for display on profiles)
CREATE POLICY "Anyone can view ratings"
  ON ratings FOR SELECT
  USING (true);
-- Users can insert ratings for their company
CREATE POLICY "Users can insert ratings for their company"
  ON ratings FOR INSERT
  WITH CHECK (
    rater_company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );
-- ============================================
-- FUNCTION TO UPDATE COMPANY PLATFORM RATING
-- ============================================

CREATE OR REPLACE FUNCTION update_company_platform_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE companies
  SET platform_rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM ratings
    WHERE rated_company_id = NEW.rated_company_id
  )
  WHERE id = NEW.rated_company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to update rating after insert
DROP TRIGGER IF EXISTS trigger_update_company_rating ON ratings;
CREATE TRIGGER trigger_update_company_rating
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_platform_rating();
