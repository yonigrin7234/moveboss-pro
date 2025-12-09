-- ============================================================================
-- ADD DRIVER_DISPATCH CONVERSATION TYPE
-- ============================================================================
-- This migration adds the 'driver_dispatch' conversation type for direct
-- messaging between drivers and their company's dispatch team.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add driver_dispatch to conversation_type enum
-- ============================================================================

ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'driver_dispatch';

-- ============================================================================
-- STEP 2: Add driver_id column to conversations table (for driver_dispatch conversations)
-- ============================================================================

-- Add driver_id to track which driver this dispatch conversation is for
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;

-- Create index for driver_id lookups
CREATE INDEX IF NOT EXISTS idx_conversations_driver_id ON conversations(driver_id);

-- ============================================================================
-- STEP 3: Add RLS policy for driver_dispatch conversations
-- ============================================================================

-- Drivers can SELECT driver_dispatch conversations where they are the driver
CREATE POLICY conversations_select_driver_dispatch
  ON conversations FOR SELECT
  USING (
    type = 'driver_dispatch'
    AND driver_id IN (
      SELECT id FROM drivers WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: Update existing RLS policies to handle driver_dispatch
-- ============================================================================

-- Drop and recreate the main conversation select policy to include driver_dispatch
DROP POLICY IF EXISTS conversations_select_company ON conversations;

CREATE POLICY conversations_select_company
  ON conversations FOR SELECT
  USING (
    -- Company members can see their company's conversations
    owner_company_id = ANY(get_user_company_ids(auth.uid()))
    OR partner_company_id = ANY(get_user_company_ids(auth.uid()))
    OR carrier_company_id = ANY(get_user_company_ids(auth.uid()))
    -- Drivers can see driver_dispatch conversations where they are the driver
    OR (
      type = 'driver_dispatch'
      AND driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
    )
  );

-- ============================================================================
-- STEP 5: Update messages RLS to allow drivers to read/write in driver_dispatch
-- ============================================================================

-- Drop and recreate messages select policy
DROP POLICY IF EXISTS messages_select_company ON messages;

CREATE POLICY messages_select_company
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          -- Company members can read messages in their company's conversations
          c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.partner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.carrier_company_id = ANY(get_user_company_ids(auth.uid()))
          -- Drivers can read messages in their driver_dispatch conversations
          OR (
            c.type = 'driver_dispatch'
            AND c.driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
          )
        )
    )
  );

-- Drop and recreate messages insert policy
DROP POLICY IF EXISTS messages_insert_company ON messages;

CREATE POLICY messages_insert_company
  ON messages FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          -- Company members can send messages in their company's conversations
          c.owner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.partner_company_id = ANY(get_user_company_ids(auth.uid()))
          OR c.carrier_company_id = ANY(get_user_company_ids(auth.uid()))
          -- Drivers can send messages in their driver_dispatch conversations
          OR (
            c.type = 'driver_dispatch'
            AND c.driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
          )
        )
    )
  );

-- Allow drivers to insert messages using sender_driver_id
CREATE POLICY messages_insert_driver_dispatch
  ON messages FOR INSERT
  WITH CHECK (
    sender_driver_id IS NOT NULL
    AND sender_driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.type = 'driver_dispatch'
        AND c.driver_id = messages.sender_driver_id
    )
  );

-- ============================================================================
-- DONE
-- ============================================================================
