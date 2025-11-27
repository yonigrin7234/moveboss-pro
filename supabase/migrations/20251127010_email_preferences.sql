-- ============================================
-- EMAIL PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Notification types
  load_status_updates BOOLEAN DEFAULT true,
  compliance_alerts BOOLEAN DEFAULT true,
  marketplace_activity BOOLEAN DEFAULT true,
  driver_assignments BOOLEAN DEFAULT true,
  daily_digest BOOLEAN DEFAULT false,
  weekly_digest BOOLEAN DEFAULT false,

  -- Digest settings
  digest_time TIME DEFAULT '08:00',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_prefs_user ON email_preferences(user_id);

-- RLS
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own email preferences"
  ON email_preferences FOR ALL
  USING (user_id = auth.uid());

-- Insert default preferences for existing users
INSERT INTO email_preferences (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;
