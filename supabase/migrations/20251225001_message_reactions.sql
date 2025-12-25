-- ============================================================================
-- MESSAGE REACTIONS TABLE
-- ============================================================================
-- Track emoji reactions on messages (like Slack/iMessage)

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

  -- Who reacted (either user or driver)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,

  -- The emoji reaction (using Unicode emoji)
  emoji TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One reaction per emoji per user/driver on a message
  CONSTRAINT unique_user_reaction UNIQUE (message_id, user_id, emoji),
  CONSTRAINT unique_driver_reaction UNIQUE (message_id, driver_id, emoji),
  -- Must have a reactor
  CONSTRAINT must_have_reactor CHECK (user_id IS NOT NULL OR driver_id IS NOT NULL)
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON message_reactions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_driver ON message_reactions(driver_id) WHERE driver_id IS NOT NULL;

-- RLS Policies
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can read reactions on messages in conversations they can access
CREATE POLICY message_reactions_select_policy ON message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      JOIN company_memberships cm ON cm.user_id = auth.uid()
      WHERE m.id = message_reactions.message_id
        AND (c.owner_company_id = cm.company_id
             OR c.partner_company_id = cm.company_id
             OR c.carrier_company_id = cm.company_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      JOIN drivers d ON d.auth_user_id = auth.uid()
      JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.driver_id = d.id
      WHERE m.id = message_reactions.message_id
        AND cp.can_read = true
    )
  );

-- Users can add reactions to messages in conversations they can write to
CREATE POLICY message_reactions_insert_policy ON message_reactions
  FOR INSERT
  WITH CHECK (
    -- User reactions
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = auth.uid()
      WHERE m.id = message_reactions.message_id
        AND cp.can_read = true
    ))
    OR
    -- Driver reactions (check if current auth user is the driver)
    (driver_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM drivers d
      JOIN messages m ON m.id = message_reactions.message_id
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.driver_id = d.id
      WHERE d.id = message_reactions.driver_id
        AND d.auth_user_id = auth.uid()
        AND cp.can_read = true
    ))
  );

-- Users can only delete their own reactions
CREATE POLICY message_reactions_delete_policy ON message_reactions
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    (driver_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = message_reactions.driver_id
        AND d.auth_user_id = auth.uid()
    ))
  );

COMMENT ON TABLE message_reactions IS 'Emoji reactions on messages';
COMMENT ON COLUMN message_reactions.emoji IS 'Unicode emoji character';
