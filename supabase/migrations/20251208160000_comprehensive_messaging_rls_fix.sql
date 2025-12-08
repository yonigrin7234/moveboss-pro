-- ============================================================================
-- COMPREHENSIVE MESSAGING RLS FIX
-- ============================================================================
-- This migration ensures all messaging RLS policies are correctly configured.
-- Run this via Supabase Dashboard SQL Editor to fix messaging issues.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create/update helper function
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
-- STEP 2: Drop ALL existing messaging policies (clean slate)
-- ============================================================================

-- Conversations policies
DROP POLICY IF EXISTS conversations_select_participant ON conversations;
DROP POLICY IF EXISTS conversations_select_company_member ON conversations;
DROP POLICY IF EXISTS conversations_insert_company_member ON conversations;
DROP POLICY IF EXISTS conversations_update_company_member ON conversations;
DROP POLICY IF EXISTS conversations_select_driver ON conversations;
DROP POLICY IF EXISTS conversations_select_company ON conversations;
DROP POLICY IF EXISTS conversations_insert_company ON conversations;
DROP POLICY IF EXISTS conversations_update_company ON conversations;
DROP POLICY IF EXISTS conversations_select_driver_direct ON conversations;

-- Conversation Participants policies
DROP POLICY IF EXISTS participants_select_accessible ON conversation_participants;
DROP POLICY IF EXISTS participants_insert_company_member ON conversation_participants;
DROP POLICY IF EXISTS participants_update_company_member ON conversation_participants;
DROP POLICY IF EXISTS participants_delete_company_member ON conversation_participants;
DROP POLICY IF EXISTS participants_select_own_or_company ON conversation_participants;
DROP POLICY IF EXISTS participants_insert_company_or_self ON conversation_participants;
DROP POLICY IF EXISTS participants_update_company ON conversation_participants;
DROP POLICY IF EXISTS participants_delete_company ON conversation_participants;
DROP POLICY IF EXISTS participants_select_driver ON conversation_participants;

-- Messages policies
DROP POLICY IF EXISTS messages_select_participant ON messages;
DROP POLICY IF EXISTS messages_insert_participant ON messages;
DROP POLICY IF EXISTS messages_update_own ON messages;
DROP POLICY IF EXISTS messages_delete_own ON messages;
DROP POLICY IF EXISTS messages_select_driver ON messages;
DROP POLICY IF EXISTS messages_insert_driver ON messages;
DROP POLICY IF EXISTS messages_select_company ON messages;
DROP POLICY IF EXISTS messages_insert_company ON messages;
DROP POLICY IF EXISTS messages_select_driver_direct ON messages;
DROP POLICY IF EXISTS messages_insert_driver_direct ON messages;

-- ============================================================================
-- STEP 3: Create new CONVERSATIONS policies
-- ============================================================================

-- SELECT: User can view conversations owned by their company OR where they're a partner/carrier
CREATE POLICY conversations_select_company
  ON conversations FOR SELECT
  USING (
    owner_company_id = ANY(get_user_company_ids(auth.uid()))
    OR partner_company_id = ANY(get_user_company_ids(auth.uid()))
    OR carrier_company_id = ANY(get_user_company_ids(auth.uid()))
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
-- STEP 4: Create new CONVERSATION_PARTICIPANTS policies
-- ============================================================================

-- SELECT: User can see their own records OR records in their company's conversations
CREATE POLICY participants_select_own_or_company
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND (
          c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.partner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.carrier_company_id = ANY(get_user_company_ids(auth.uid()))
        )
    )
  );

-- INSERT: User can add participants to conversations owned by their company
CREATE POLICY participants_insert_company_or_self
  ON conversation_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR
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
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
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
-- STEP 5: Create new MESSAGES policies
-- ============================================================================

-- SELECT: User can read messages in conversations they have access to via company
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

-- INSERT: User can send messages if they're the sender AND have company access
CREATE POLICY messages_insert_company
  ON messages FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid()
    AND
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
-- STEP 6: Ensure RLS is enabled on all tables
-- ============================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

-- ============================================================================
-- DEBUG: Verify the helper function works
-- ============================================================================

-- You can run this to test (replace with actual user_id):
-- SELECT get_user_company_ids('your-user-uuid-here'::uuid);

-- ============================================================================
-- DONE
-- ============================================================================
