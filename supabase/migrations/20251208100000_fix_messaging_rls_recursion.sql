-- ============================================================================
-- FIX MESSAGING RLS RECURSION
-- ============================================================================
-- This migration fixes the infinite recursion in conversation_participants
-- policies by using non-recursive checks based on company membership
-- ============================================================================

-- ============================================================================
-- DROP ALL EXISTING POLICIES (clean slate)
-- ============================================================================

-- Conversations
DROP POLICY IF EXISTS conversations_select_participant ON conversations;
DROP POLICY IF EXISTS conversations_select_company_member ON conversations;
DROP POLICY IF EXISTS conversations_insert_company_member ON conversations;
DROP POLICY IF EXISTS conversations_update_company_member ON conversations;
DROP POLICY IF EXISTS conversations_select_driver ON conversations;

-- Conversation Participants
DROP POLICY IF EXISTS participants_select_accessible ON conversation_participants;
DROP POLICY IF EXISTS participants_insert_company_member ON conversation_participants;
DROP POLICY IF EXISTS participants_update_company_member ON conversation_participants;
DROP POLICY IF EXISTS participants_delete_company_member ON conversation_participants;

-- Messages
DROP POLICY IF EXISTS messages_select_participant ON messages;
DROP POLICY IF EXISTS messages_insert_participant ON messages;
DROP POLICY IF EXISTS messages_update_own ON messages;
DROP POLICY IF EXISTS messages_delete_own ON messages;
DROP POLICY IF EXISTS messages_select_driver ON messages;
DROP POLICY IF EXISTS messages_insert_driver ON messages;

-- Read receipts
DROP POLICY IF EXISTS receipts_select_accessible ON message_read_receipts;
DROP POLICY IF EXISTS receipts_insert_own ON message_read_receipts;
DROP POLICY IF EXISTS receipts_insert_driver ON message_read_receipts;

-- Activity log
DROP POLICY IF EXISTS activity_log_select_accessible ON conversation_activity_log;
DROP POLICY IF EXISTS activity_log_insert_system ON conversation_activity_log;

-- Load/Partner communication settings
DROP POLICY IF EXISTS load_comm_select_company ON load_communication_settings;
DROP POLICY IF EXISTS load_comm_insert_dispatcher ON load_communication_settings;
DROP POLICY IF EXISTS load_comm_update_dispatcher ON load_communication_settings;
DROP POLICY IF EXISTS partner_comm_select_company ON partner_communication_settings;
DROP POLICY IF EXISTS partner_comm_insert_carrier ON partner_communication_settings;
DROP POLICY IF EXISTS partner_comm_update_carrier ON partner_communication_settings;
DROP POLICY IF EXISTS partner_comm_update_partner_lock ON partner_communication_settings;

-- ============================================================================
-- HELPER FUNCTION: Get user's company IDs (cached, non-recursive)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_company_ids(p_user_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(
    array_agg(company_id),
    ARRAY[]::UUID[]
  )
  FROM company_memberships
  WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- CONVERSATION_PARTICIPANTS POLICIES (Non-recursive - MUST come first)
-- ============================================================================
-- KEY: These policies must NOT query conversation_participants itself

-- SELECT: User can see their own participant record OR records in their company's conversations
CREATE POLICY participants_select_own_or_company
  ON conversation_participants FOR SELECT
  USING (
    -- User can always see their own participant records
    user_id = auth.uid()
    OR
    -- User can see participants in conversations owned by their company
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
    )
    OR
    -- User can see participants in shared/partner conversations they're part of
    -- (check via conversations.partner_company_id matching user's company)
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.partner_company_id = ANY(get_user_company_ids(auth.uid()))
    )
  );

-- INSERT: User can add participants to conversations owned by their company
-- OR can insert themselves as a participant
CREATE POLICY participants_insert_company_or_self
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- User can add themselves to any conversation (will be validated by conversation access)
    user_id = auth.uid()
    OR
    -- User can add participants to their company's conversations
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
    )
  );

-- UPDATE: User can update participant records in their company's conversations
CREATE POLICY participants_update_company
  ON conversation_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
    )
  );

-- DELETE: User can remove participants from their company's conversations
CREATE POLICY participants_delete_company
  ON conversation_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
    )
  );

-- ============================================================================
-- CONVERSATIONS POLICIES (Use company membership, not participant check)
-- ============================================================================

-- SELECT: User can view conversations owned by their company OR where they're a partner
CREATE POLICY conversations_select_company
  ON conversations FOR SELECT
  USING (
    -- User is in the owner company
    owner_company_id = ANY(get_user_company_ids(auth.uid()))
    OR
    -- User is in the partner company (for shared/company-to-company)
    partner_company_id = ANY(get_user_company_ids(auth.uid()))
    OR
    -- User is in the carrier company
    carrier_company_id = ANY(get_user_company_ids(auth.uid()))
  );

-- INSERT: User can create conversations for their company
CREATE POLICY conversations_insert_company
  ON conversations FOR INSERT
  WITH CHECK (
    owner_company_id = ANY(get_user_company_ids(auth.uid()))
  );

-- UPDATE: User can update conversations for their company
CREATE POLICY conversations_update_company
  ON conversations FOR UPDATE
  USING (
    owner_company_id = ANY(get_user_company_ids(auth.uid()))
  )
  WITH CHECK (
    owner_company_id = ANY(get_user_company_ids(auth.uid()))
  );

-- ============================================================================
-- MESSAGES POLICIES (Check conversation access via company, not participants)
-- ============================================================================

-- SELECT: User can read messages in conversations they have access to
CREATE POLICY messages_select_company
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.partner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.carrier_company_id = ANY(get_user_company_ids(auth.uid()))
        )
    )
  );

-- INSERT: User can send messages to conversations in their company
-- AND must be the sender
CREATE POLICY messages_insert_company
  ON messages FOR INSERT
  WITH CHECK (
    -- Must be authenticated user
    sender_user_id = auth.uid()
    AND
    -- Must have access to conversation via company
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.partner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.carrier_company_id = ANY(get_user_company_ids(auth.uid()))
        )
    )
  );

-- UPDATE: User can update their own messages
CREATE POLICY messages_update_own
  ON messages FOR UPDATE
  USING (sender_user_id = auth.uid())
  WITH CHECK (sender_user_id = auth.uid());

-- DELETE: User can delete their own messages
CREATE POLICY messages_delete_own
  ON messages FOR DELETE
  USING (sender_user_id = auth.uid());

-- ============================================================================
-- MESSAGE READ RECEIPTS POLICIES
-- ============================================================================

-- SELECT: User can view receipts for messages they can read
CREATE POLICY receipts_select_company
  ON message_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_read_receipts.message_id
        AND (
          c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.partner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.carrier_company_id = ANY(get_user_company_ids(auth.uid()))
        )
    )
  );

-- INSERT: User can create read receipts for themselves
CREATE POLICY receipts_insert_own
  ON message_read_receipts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_read_receipts.message_id
        AND (
          c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.partner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.carrier_company_id = ANY(get_user_company_ids(auth.uid()))
        )
    )
  );

-- ============================================================================
-- CONVERSATION ACTIVITY LOG POLICIES
-- ============================================================================

-- SELECT: User can view activity for conversations in their company
CREATE POLICY activity_log_select_company
  ON conversation_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_activity_log.conversation_id
        AND (
          c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.partner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.carrier_company_id = ANY(get_user_company_ids(auth.uid()))
        )
    )
  );

-- INSERT: Allow system inserts (triggers/functions use SECURITY DEFINER)
CREATE POLICY activity_log_insert_system
  ON conversation_activity_log FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- LOAD COMMUNICATION SETTINGS POLICIES
-- ============================================================================

-- SELECT: Users can view settings for loads in their company
CREATE POLICY load_comm_select_company
  ON load_communication_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loads l
      WHERE l.id = load_communication_settings.load_id
        AND l.company_id = ANY(get_user_company_ids(auth.uid()))
    )
  );

-- INSERT: Users can create settings for loads in their company
CREATE POLICY load_comm_insert_company
  ON load_communication_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loads l
      WHERE l.id = load_communication_settings.load_id
        AND l.company_id = ANY(get_user_company_ids(auth.uid()))
    )
  );

-- UPDATE: Users can update settings for loads in their company
CREATE POLICY load_comm_update_company
  ON load_communication_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loads l
      WHERE l.id = load_communication_settings.load_id
        AND l.company_id = ANY(get_user_company_ids(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loads l
      WHERE l.id = load_communication_settings.load_id
        AND l.company_id = ANY(get_user_company_ids(auth.uid()))
    )
  );

-- ============================================================================
-- PARTNER COMMUNICATION SETTINGS POLICIES
-- ============================================================================

-- SELECT: Users can view settings for their company (either side)
CREATE POLICY partner_comm_select_company
  ON partner_communication_settings FOR SELECT
  USING (
    carrier_company_id = ANY(get_user_company_ids(auth.uid()))
    OR
    partner_company_id = ANY(get_user_company_ids(auth.uid()))
  );

-- INSERT: Carrier company can create settings
CREATE POLICY partner_comm_insert_carrier
  ON partner_communication_settings FOR INSERT
  WITH CHECK (
    carrier_company_id = ANY(get_user_company_ids(auth.uid()))
  );

-- UPDATE: Carrier company can update settings
CREATE POLICY partner_comm_update_carrier
  ON partner_communication_settings FOR UPDATE
  USING (
    carrier_company_id = ANY(get_user_company_ids(auth.uid()))
  )
  WITH CHECK (
    carrier_company_id = ANY(get_user_company_ids(auth.uid()))
  );

-- UPDATE: Partner company can also update (for lock visibility, etc.)
CREATE POLICY partner_comm_update_partner
  ON partner_communication_settings FOR UPDATE
  USING (
    partner_company_id = ANY(get_user_company_ids(auth.uid()))
  )
  WITH CHECK (
    partner_company_id = ANY(get_user_company_ids(auth.uid()))
  );

-- ============================================================================
-- DRIVER ACCESS (via driver_id linkage)
-- ============================================================================

-- Keep the helper function for driver ID lookup
CREATE OR REPLACE FUNCTION get_user_driver_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT d.id FROM drivers d
  JOIN profiles p ON d.email = p.email OR d.phone = p.phone
  WHERE p.id = p_user_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drivers can view conversations where they're participants (via driver_id)
CREATE POLICY conversations_select_driver
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.driver_id = get_user_driver_id(auth.uid())
        AND cp.can_read = TRUE
    )
  );

-- Drivers can read messages in their conversations
CREATE POLICY messages_select_driver
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.id = messages.conversation_id
        AND cp.driver_id = get_user_driver_id(auth.uid())
        AND cp.can_read = TRUE
    )
  );

-- Drivers can send messages if they have write access
CREATE POLICY messages_insert_driver
  ON messages FOR INSERT
  WITH CHECK (
    sender_driver_id = get_user_driver_id(auth.uid())
    AND
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.id = messages.conversation_id
        AND cp.driver_id = get_user_driver_id(auth.uid())
        AND cp.can_write = TRUE
    )
  );

-- Drivers can view participant records for their conversations
CREATE POLICY participants_select_driver
  ON conversation_participants FOR SELECT
  USING (
    driver_id = get_user_driver_id(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.driver_id = get_user_driver_id(auth.uid())
    )
  );

-- Drivers can create read receipts
CREATE POLICY receipts_insert_driver
  ON message_read_receipts FOR INSERT
  WITH CHECK (
    driver_id = get_user_driver_id(auth.uid())
    AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE m.id = message_read_receipts.message_id
        AND cp.driver_id = get_user_driver_id(auth.uid())
        AND cp.can_read = TRUE
    )
  );
