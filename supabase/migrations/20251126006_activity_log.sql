-- Activity Log for tracking driver actions in real-time
-- This enables the owner to see live updates from drivers

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) NOT NULL,

  -- Who did it
  driver_id UUID REFERENCES drivers(id),
  driver_name TEXT,

  -- What happened
  activity_type TEXT NOT NULL,
  -- Types: trip_started, trip_completed, load_accepted, loading_started,
  -- loading_finished, delivery_started, delivery_completed, expense_added

  -- Related entities
  trip_id UUID REFERENCES trips(id),
  trip_number TEXT,
  load_id UUID,
  load_number TEXT,
  expense_id UUID,

  -- Details
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- When
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_activity_log_owner_id ON activity_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_driver_id ON activity_log(driver_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_trip_id ON activity_log(trip_id);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Owners can view their activity logs"
  ON activity_log FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "System can insert activity logs"
  ON activity_log FOR INSERT
  WITH CHECK (true);
