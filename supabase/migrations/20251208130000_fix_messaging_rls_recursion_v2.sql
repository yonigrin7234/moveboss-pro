-- ============================================================================
-- FIX MESSAGING RLS RECURSION V2
-- ============================================================================
-- The previous fix still had recursion in driver policies.
-- This version removes ALL circular dependencies by:
-- 1. Removing driver policies that query conversation_participants from conversations
-- 2. Using simple direct checks only
-- ============================================================================

-- Drop the problematic driver policies that cause recursion
DROP POLICY IF EXISTS conversations_select_driver ON conversations;
DROP POLICY IF EXISTS messages_select_driver ON messages;
DROP POLICY IF EXISTS messages_insert_driver ON messages;
DROP POLICY IF EXISTS participants_select_driver ON conversation_participants;
DROP POLICY IF EXISTS receipts_insert_driver ON message_read_receipts;

-- Also drop the _direct versions in case they exist from a partial migration
DROP POLICY IF EXISTS conversations_select_driver_direct ON conversations;
DROP POLICY IF EXISTS messages_select_driver_direct ON messages;
DROP POLICY IF EXISTS messages_insert_driver_direct ON messages;
DROP POLICY IF EXISTS participants_select_driver_direct ON conversation_participants;
DROP POLICY IF EXISTS receipts_insert_driver_direct ON message_read_receipts;

-- ============================================================================
-- SIMPLIFIED POLICIES - NO CROSS-TABLE RECURSION
-- ============================================================================

-- For drivers: They access conversations via their linked user account's company.
-- If a driver has a user account, they get access through company membership.
-- For driver-specific access without a user account, we use a simpler approach.

-- Conversations: Add driver access via direct trip/load linkage (no participant check)
CREATE POLICY conversations_select_driver_direct
  ON conversations FOR SELECT
  USING (
    -- Driver can see trip conversations for trips they're assigned to
    (type = 'trip_internal' AND trip_id IN (
      SELECT t.id FROM trips t
      WHERE t.driver_id = get_user_driver_id(auth.uid())
    ))
    OR
    -- Driver can see load conversations for loads on their trips
    (type IN ('load_internal', 'load_shared') AND load_id IN (
      SELECT tl.load_id FROM trip_loads tl
      JOIN trips t ON tl.trip_id = t.id
      WHERE t.driver_id = get_user_driver_id(auth.uid())
    ))
  );

-- Messages: Driver access via conversation ownership (no participant check)
CREATE POLICY messages_select_driver_direct
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE
        -- Trip conversations for driver's trips
        (c.type = 'trip_internal' AND c.trip_id IN (
          SELECT t.id FROM trips t
          WHERE t.driver_id = get_user_driver_id(auth.uid())
        ))
        OR
        -- Load conversations for loads on driver's trips
        (c.type IN ('load_internal', 'load_shared') AND c.load_id IN (
          SELECT tl.load_id FROM trip_loads tl
          JOIN trips t ON tl.trip_id = t.id
          WHERE t.driver_id = get_user_driver_id(auth.uid())
        ))
    )
  );

-- Messages: Driver can send messages to their trip/load conversations
CREATE POLICY messages_insert_driver_direct
  ON messages FOR INSERT
  WITH CHECK (
    sender_driver_id = get_user_driver_id(auth.uid())
    AND
    conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE
        (c.type = 'trip_internal' AND c.trip_id IN (
          SELECT t.id FROM trips t
          WHERE t.driver_id = get_user_driver_id(auth.uid())
        ))
        OR
        (c.type IN ('load_internal', 'load_shared') AND c.load_id IN (
          SELECT tl.load_id FROM trip_loads tl
          JOIN trips t ON tl.trip_id = t.id
          WHERE t.driver_id = get_user_driver_id(auth.uid())
        ))
    )
  );

-- Conversation participants: Driver can see participant records for their conversations
-- Using direct trip/load checks, NOT participant table self-reference
CREATE POLICY participants_select_driver_direct
  ON conversation_participants FOR SELECT
  USING (
    -- Driver can see their own participant record
    driver_id = get_user_driver_id(auth.uid())
    OR
    -- Driver can see participants in their trip conversations
    conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE
        (c.type = 'trip_internal' AND c.trip_id IN (
          SELECT t.id FROM trips t
          WHERE t.driver_id = get_user_driver_id(auth.uid())
        ))
        OR
        (c.type IN ('load_internal', 'load_shared') AND c.load_id IN (
          SELECT tl.load_id FROM trip_loads tl
          JOIN trips t ON tl.trip_id = t.id
          WHERE t.driver_id = get_user_driver_id(auth.uid())
        ))
    )
  );

-- Read receipts: Driver can create receipts for messages they can read
CREATE POLICY receipts_insert_driver_direct
  ON message_read_receipts FOR INSERT
  WITH CHECK (
    driver_id = get_user_driver_id(auth.uid())
    AND
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE
        (c.type = 'trip_internal' AND c.trip_id IN (
          SELECT t.id FROM trips t
          WHERE t.driver_id = get_user_driver_id(auth.uid())
        ))
        OR
        (c.type IN ('load_internal', 'load_shared') AND c.load_id IN (
          SELECT tl.load_id FROM trip_loads tl
          JOIN trips t ON tl.trip_id = t.id
          WHERE t.driver_id = get_user_driver_id(auth.uid())
        ))
    )
  );
