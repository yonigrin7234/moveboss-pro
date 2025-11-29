-- Push notification tokens for mobile devices
BEGIN;

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint on user + token to prevent duplicates
  UNIQUE(user_id, token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_driver ON push_tokens(driver_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
DROP POLICY IF EXISTS "Users can view own push tokens" ON push_tokens;
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own push tokens" ON push_tokens;
CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own push tokens" ON push_tokens;
CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own push tokens" ON push_tokens;
CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (user_id = auth.uid());

-- Notification log for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_driver ON notification_log(driver_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent ON notification_log(sent_at DESC);

-- RLS for notification log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notification_log;
CREATE POLICY "Users can view own notifications"
  ON notification_log FOR SELECT
  USING (user_id = auth.uid());

COMMIT;
