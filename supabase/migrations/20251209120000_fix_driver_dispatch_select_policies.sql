-- ============================================================================
-- FIX DRIVER DISPATCH SELECT POLICIES
-- ============================================================================
-- Ensures drivers can read messages and participants in their dispatch conversations
-- ============================================================================

-- ============================================================================
-- STEP 1: Add messages SELECT policy for driver_dispatch
-- ============================================================================

DROP POLICY IF EXISTS messages_select_driver_dispatch ON messages;

CREATE POLICY messages_select_driver_dispatch
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.type = 'driver_dispatch'
        AND c.driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
    )
  );

-- ============================================================================
-- STEP 2: Ensure participants SELECT policy covers driver_dispatch
-- ============================================================================

DROP POLICY IF EXISTS participants_select_driver_dispatch ON conversation_participants;

CREATE POLICY participants_select_driver_dispatch
  ON conversation_participants FOR SELECT
  USING (
    -- Driver can see their own participant record in driver_dispatch conversations
    driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
    OR
    -- Driver can see all participants in their driver_dispatch conversations
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.type = 'driver_dispatch'
        AND c.driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
    )
  );

-- ============================================================================
-- STEP 3: Ensure conversations SELECT policy covers driver_dispatch
-- ============================================================================
-- The conversations_select_driver_dispatch policy should already exist,
-- but let's make sure it's correct

DROP POLICY IF EXISTS conversations_select_driver_dispatch ON conversations;

CREATE POLICY conversations_select_driver_dispatch
  ON conversations FOR SELECT
  USING (
    type = 'driver_dispatch'
    AND driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
  );

-- ============================================================================
-- DONE
-- ============================================================================
