-- ============================================================================
-- MOVEBOSS COMMUNICATION SYSTEM - RLS POLICIES
-- ============================================================================
-- Row Level Security policies for the communication system
-- These enforce permission checks at the database level
-- ============================================================================

-- Enable RLS on all communication tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================

-- Users can view conversations they are participants of
CREATE POLICY conversations_select_participant
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
        AND cp.can_read = TRUE
    )
  );

-- Users can view conversations for their company
CREATE POLICY conversations_select_company_member
  ON conversations FOR SELECT
  USING (
    owner_company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Company members can create conversations for their company
CREATE POLICY conversations_insert_company_member
  ON conversations FOR INSERT
  WITH CHECK (
    owner_company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Company members can update conversations for their company
CREATE POLICY conversations_update_company_member
  ON conversations FOR UPDATE
  USING (
    owner_company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- CONVERSATION PARTICIPANTS POLICIES
-- ============================================================================

-- Users can view participant records for conversations they can access
CREATE POLICY participants_select_accessible
  ON conversation_participants FOR SELECT
  USING (
    -- User is a participant in the same conversation
    conversation_id IN (
      SELECT cp.conversation_id FROM conversation_participants cp
      WHERE cp.user_id = auth.uid() AND cp.can_read = TRUE
    )
    OR
    -- User is a member of the conversation's owner company
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN company_memberships cm ON c.owner_company_id = cm.company_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Company members can add participants to their company's conversations
CREATE POLICY participants_insert_company_member
  ON conversation_participants FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN company_memberships cm ON c.owner_company_id = cm.company_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Company members can update participants in their company's conversations
CREATE POLICY participants_update_company_member
  ON conversation_participants FOR UPDATE
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN company_memberships cm ON c.owner_company_id = cm.company_id
      WHERE cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN company_memberships cm ON c.owner_company_id = cm.company_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Company members can remove participants from their company's conversations
CREATE POLICY participants_delete_company_member
  ON conversation_participants FOR DELETE
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN company_memberships cm ON c.owner_company_id = cm.company_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can read messages in conversations they have read access to
CREATE POLICY messages_select_participant
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT cp.conversation_id FROM conversation_participants cp
      WHERE cp.user_id = auth.uid() AND cp.can_read = TRUE
    )
  );

-- Users can send messages to conversations they have write access to
CREATE POLICY messages_insert_participant
  ON messages FOR INSERT
  WITH CHECK (
    -- User must have write permission
    conversation_id IN (
      SELECT cp.conversation_id FROM conversation_participants cp
      WHERE cp.user_id = auth.uid() AND cp.can_write = TRUE
    )
    AND
    -- Sender must be the authenticated user
    sender_user_id = auth.uid()
  );

-- Users can update their own messages (for editing)
CREATE POLICY messages_update_own
  ON messages FOR UPDATE
  USING (sender_user_id = auth.uid())
  WITH CHECK (sender_user_id = auth.uid());

-- Users can soft-delete their own messages
CREATE POLICY messages_delete_own
  ON messages FOR DELETE
  USING (sender_user_id = auth.uid());

-- ============================================================================
-- LOAD COMMUNICATION SETTINGS POLICIES
-- ============================================================================

-- Users can view settings for loads in their company
CREATE POLICY load_comm_select_company
  ON load_communication_settings FOR SELECT
  USING (
    load_id IN (
      SELECT l.id FROM loads l
      WHERE l.company_id IN (
        SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- Dispatchers and owners can create/update load communication settings
CREATE POLICY load_comm_insert_dispatcher
  ON load_communication_settings FOR INSERT
  WITH CHECK (
    load_id IN (
      SELECT l.id FROM loads l
      JOIN company_memberships cm ON l.company_id = cm.company_id
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'dispatcher', 'admin')
    )
  );

CREATE POLICY load_comm_update_dispatcher
  ON load_communication_settings FOR UPDATE
  USING (
    load_id IN (
      SELECT l.id FROM loads l
      JOIN company_memberships cm ON l.company_id = cm.company_id
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'dispatcher', 'admin')
    )
  )
  WITH CHECK (
    load_id IN (
      SELECT l.id FROM loads l
      JOIN company_memberships cm ON l.company_id = cm.company_id
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'dispatcher', 'admin')
    )
  );

-- ============================================================================
-- PARTNER COMMUNICATION SETTINGS POLICIES
-- ============================================================================

-- Users can view partner settings for their company (either side)
CREATE POLICY partner_comm_select_company
  ON partner_communication_settings FOR SELECT
  USING (
    carrier_company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
    OR
    partner_company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  );

-- Carrier company members can create/update partner settings
CREATE POLICY partner_comm_insert_carrier
  ON partner_communication_settings FOR INSERT
  WITH CHECK (
    carrier_company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'dispatcher', 'admin')
    )
  );

CREATE POLICY partner_comm_update_carrier
  ON partner_communication_settings FOR UPDATE
  USING (
    carrier_company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'dispatcher', 'admin')
    )
  )
  WITH CHECK (
    carrier_company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'dispatcher', 'admin')
    )
  );

-- Partner can update lock_driver_visibility only
CREATE POLICY partner_comm_update_partner_lock
  ON partner_communication_settings FOR UPDATE
  USING (
    partner_company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'dispatcher', 'admin')
    )
  )
  WITH CHECK (
    partner_company_id IN (
      SELECT company_id FROM company_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'dispatcher', 'admin')
    )
  );

-- ============================================================================
-- MESSAGE READ RECEIPTS POLICIES
-- ============================================================================

-- Users can view read receipts for messages they can read
CREATE POLICY receipts_select_accessible
  ON message_read_receipts FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid() AND cp.can_read = TRUE
    )
  );

-- Users can create read receipts for themselves
CREATE POLICY receipts_insert_own
  ON message_read_receipts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid() AND cp.can_read = TRUE
    )
  );

-- ============================================================================
-- CONVERSATION ACTIVITY LOG POLICIES
-- ============================================================================

-- Users can view activity for conversations they can access
CREATE POLICY activity_log_select_accessible
  ON conversation_activity_log FOR SELECT
  USING (
    conversation_id IN (
      SELECT cp.conversation_id FROM conversation_participants cp
      WHERE cp.user_id = auth.uid() AND cp.can_read = TRUE
    )
  );

-- System/functions can insert activity logs (via SECURITY DEFINER functions)
CREATE POLICY activity_log_insert_system
  ON conversation_activity_log FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- DRIVER-SPECIFIC ACCESS (via linked user accounts or driver_id)
-- ============================================================================

-- Helper function to get driver_id for a user
CREATE OR REPLACE FUNCTION get_user_driver_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT d.id FROM drivers d
  JOIN profiles p ON d.email = p.email OR d.phone = p.phone
  WHERE p.id = p_user_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drivers can view conversations they're participants of (via driver_id)
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

-- Drivers can view messages in their conversations
CREATE POLICY messages_select_driver
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT cp.conversation_id FROM conversation_participants cp
      WHERE cp.driver_id = get_user_driver_id(auth.uid())
        AND cp.can_read = TRUE
    )
  );

-- Drivers can send messages if they have write access
CREATE POLICY messages_insert_driver
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT cp.conversation_id FROM conversation_participants cp
      WHERE cp.driver_id = get_user_driver_id(auth.uid())
        AND cp.can_write = TRUE
    )
    AND
    sender_driver_id = get_user_driver_id(auth.uid())
  );

-- Drivers can create read receipts
CREATE POLICY receipts_insert_driver
  ON message_read_receipts FOR INSERT
  WITH CHECK (
    driver_id = get_user_driver_id(auth.uid())
    AND
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.driver_id = get_user_driver_id(auth.uid())
        AND cp.can_read = TRUE
    )
  );
