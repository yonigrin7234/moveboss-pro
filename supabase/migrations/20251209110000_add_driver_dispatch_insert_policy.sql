-- ============================================================================
-- ADD INSERT POLICY FOR DRIVER DISPATCH CONVERSATIONS
-- ============================================================================
-- This migration adds RLS policies allowing drivers to create their own
-- driver_dispatch conversations and add themselves as participants.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add INSERT policy for conversations table
-- ============================================================================
-- Allow drivers to create driver_dispatch conversations for themselves

DROP POLICY IF EXISTS conversations_insert_driver_dispatch ON conversations;
CREATE POLICY conversations_insert_driver_dispatch
  ON conversations FOR INSERT
  WITH CHECK (
    type = 'driver_dispatch'
    AND driver_id IN (
      SELECT id FROM drivers WHERE auth_user_id = auth.uid()
    )
    AND owner_company_id IN (
      SELECT company_id FROM drivers WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 2: Add INSERT policy for conversation_participants table
-- ============================================================================
-- Allow drivers to add themselves as participants to their dispatch conversations

DROP POLICY IF EXISTS participants_insert_driver_dispatch ON conversation_participants;
CREATE POLICY participants_insert_driver_dispatch
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- Driver can only add themselves
    driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
    AND is_driver = TRUE
    -- Only in driver_dispatch conversations they belong to
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.type = 'driver_dispatch'
        AND c.driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
    )
  );

-- ============================================================================
-- STEP 3: Add UPDATE policy for conversation_participants for drivers
-- ============================================================================
-- Allow drivers to update their own participant record (e.g., mark as read)

DROP POLICY IF EXISTS participants_update_driver_own ON conversation_participants;
CREATE POLICY participants_update_driver_own
  ON conversation_participants FOR UPDATE
  USING (
    driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
  );

-- ============================================================================
-- DONE
-- ============================================================================
