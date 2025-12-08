-- ============================================================================
-- MOVEBOSS COMMUNICATION SYSTEM - PHASE 1: MESSAGING + PERMISSIONS
-- ============================================================================
-- This migration creates the complete communication infrastructure including:
-- 1. Conversations (contextual threads)
-- 2. Conversation participants (permission management)
-- 3. Messages
-- 4. Load communication settings
-- 5. Partner company communication settings
-- 6. Message read receipts
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES (with IF NOT EXISTS pattern)
-- ============================================================================

-- Conversation types for contextual messaging
DO $$ BEGIN
  CREATE TYPE conversation_type AS ENUM (
    'load_shared',        -- Carrier <-> Partner for a specific load (visible based on driver_visibility)
    'load_internal',      -- Internal carrier team discussion about a load
    'trip_internal',      -- Internal carrier team discussion about a trip
    'company_to_company', -- General carrier <-> partner communication (not load-specific)
    'general'             -- General company-wide or team chat
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Driver visibility levels for shared conversations
DO $$ BEGIN
  CREATE TYPE driver_visibility_level AS ENUM (
    'none',       -- Driver cannot see the shared conversation at all
    'read_only',  -- Driver can see but not reply to shared conversation
    'full'        -- Driver can see and reply to shared conversation
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Participant roles in conversations
DO $$ BEGIN
  CREATE TYPE conversation_participant_role AS ENUM (
    'owner',          -- Company owner
    'dispatcher',     -- Dispatcher
    'driver',         -- Driver
    'helper',         -- Helper on a load/trip
    'partner_rep',    -- Representative from partner company
    'broker',         -- Broker role
    'ai_agent'        -- AI agent participant (for tracking AI interactions)
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Message types for classification
DO $$ BEGIN
  CREATE TYPE message_type AS ENUM (
    'text',              -- Regular text message
    'system',            -- System-generated message (load assigned, status change, etc.)
    'ai_response',       -- AI agent response
    'document',          -- Document/file attachment
    'image',             -- Image attachment
    'voice',             -- Voice message
    'location',          -- Location share
    'balance_request',   -- Balance verification request
    'status_update'      -- Status update (arrival, departure, etc.)
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation type determines visibility and routing rules
  type conversation_type NOT NULL,

  -- Owner company (carrier) - required for all conversations
  owner_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Contextual references (nullable based on type)
  load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,

  -- For company_to_company conversations
  carrier_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  partner_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Conversation metadata
  title TEXT, -- Optional display title
  is_archived BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,

  -- Last activity tracking for sorting
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  message_count INTEGER DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_load_conversation CHECK (
    (type IN ('load_shared', 'load_internal') AND load_id IS NOT NULL) OR
    (type NOT IN ('load_shared', 'load_internal'))
  ),
  CONSTRAINT valid_trip_conversation CHECK (
    (type = 'trip_internal' AND trip_id IS NOT NULL) OR
    (type != 'trip_internal')
  ),
  CONSTRAINT valid_company_conversation CHECK (
    (type = 'company_to_company' AND carrier_company_id IS NOT NULL AND partner_company_id IS NOT NULL) OR
    (type != 'company_to_company')
  )
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_conversations_owner_company ON conversations(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_conversations_load ON conversations(load_id) WHERE load_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_trip ON conversations(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_company_pair ON conversations(carrier_company_id, partner_company_id)
  WHERE type = 'company_to_company';
CREATE INDEX IF NOT EXISTS idx_conversations_not_archived ON conversations(owner_company_id, last_message_at DESC)
  WHERE is_archived = FALSE;

-- ============================================================================
-- 3. CONVERSATION PARTICIPANTS TABLE
-- ============================================================================
-- This is the SINGLE SOURCE OF TRUTH for who can access which conversations

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,

  -- Role and permissions
  role conversation_participant_role NOT NULL,
  can_read BOOLEAN DEFAULT TRUE NOT NULL,
  can_write BOOLEAN DEFAULT TRUE NOT NULL,
  is_driver BOOLEAN DEFAULT FALSE NOT NULL,

  -- Notification preferences
  notifications_enabled BOOLEAN DEFAULT TRUE,
  is_muted BOOLEAN DEFAULT FALSE,

  -- Read tracking
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,

  -- Who added this participant
  added_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- A user can only be in a conversation once
  CONSTRAINT unique_user_conversation UNIQUE (conversation_id, user_id),
  -- A driver can only be in a conversation once
  CONSTRAINT unique_driver_conversation UNIQUE (conversation_id, driver_id),
  -- Must have either user_id or driver_id
  CONSTRAINT must_have_participant CHECK (user_id IS NOT NULL OR driver_id IS NOT NULL)
);

-- Indexes for permission lookups
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participants_driver ON conversation_participants(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participants_company ON conversation_participants(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participants_can_read ON conversation_participants(conversation_id, can_read) WHERE can_read = TRUE;
CREATE INDEX IF NOT EXISTS idx_participants_unread ON conversation_participants(user_id, unread_count)
  WHERE unread_count > 0 AND user_id IS NOT NULL;

-- ============================================================================
-- 4. MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation reference
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Sender information
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  sender_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Message content
  message_type message_type DEFAULT 'text' NOT NULL,
  body TEXT NOT NULL,

  -- Rich content (for documents, images, etc.)
  attachments JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ type: 'image'|'document'|'voice', url: string, name: string, size: number }]

  -- AI/System metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  -- For AI: { ai_model: string, intent: string, confidence: number, context_used: string[] }
  -- For system: { event_type: string, related_ids: {...} }

  -- Message threading (for replies)
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- Edit tracking
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  original_body TEXT, -- Store original if edited

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Must have a sender
  CONSTRAINT must_have_sender CHECK (sender_user_id IS NOT NULL OR sender_driver_id IS NOT NULL)
);

-- Indexes for message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_user ON messages(sender_user_id) WHERE sender_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sender_driver ON messages(sender_driver_id) WHERE sender_driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON messages(conversation_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(conversation_id, message_type);

-- ============================================================================
-- 5. LOAD COMMUNICATION SETTINGS TABLE
-- ============================================================================
-- Per-load settings that control driver visibility in shared conversations

CREATE TABLE IF NOT EXISTS load_communication_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Load reference (unique per load)
  load_id UUID NOT NULL UNIQUE REFERENCES loads(id) ON DELETE CASCADE,

  -- Driver visibility for the shared conversation
  driver_visibility driver_visibility_level DEFAULT 'none' NOT NULL,

  -- Which driver this applies to (optional, for multi-driver loads)
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,

  -- Allow partner to message driver directly
  allow_partner_direct_to_driver BOOLEAN DEFAULT FALSE,

  -- Auto-add driver to internal conversation
  auto_add_driver_to_internal BOOLEAN DEFAULT TRUE,

  -- Notes about communication preferences
  notes TEXT,

  -- Who set these preferences
  set_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_load_comm_settings_load ON load_communication_settings(load_id);
CREATE INDEX IF NOT EXISTS idx_load_comm_settings_driver ON load_communication_settings(driver_id)
  WHERE driver_id IS NOT NULL;

-- ============================================================================
-- 6. PARTNER COMPANY COMMUNICATION SETTINGS TABLE
-- ============================================================================
-- Default communication policies between a carrier and partner

CREATE TABLE IF NOT EXISTS partner_communication_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company pair (carrier <-> partner)
  carrier_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  partner_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Default driver visibility for loads with this partner
  default_driver_visibility driver_visibility_level DEFAULT 'none' NOT NULL,

  -- Whether partner can lock the driver visibility setting
  -- When TRUE, carrier cannot override the partner's default for their loads
  lock_driver_visibility BOOLEAN DEFAULT FALSE,

  -- Allow direct driver <-> partner messages (bypassing dispatch)
  allow_driver_partner_direct_messages BOOLEAN DEFAULT FALSE,

  -- Auto-create shared conversation when load is assigned to this partner
  auto_create_shared_conversation BOOLEAN DEFAULT TRUE,

  -- Notification preferences
  notify_on_load_status_change BOOLEAN DEFAULT TRUE,
  notify_on_driver_location_update BOOLEAN DEFAULT FALSE,

  -- Partnership-specific notes
  notes TEXT,

  -- Who set these preferences
  set_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint on company pair
  CONSTRAINT unique_partner_settings UNIQUE (carrier_company_id, partner_company_id),
  -- Cannot have same company on both sides
  CONSTRAINT different_companies CHECK (carrier_company_id != partner_company_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_comm_carrier ON partner_communication_settings(carrier_company_id);
CREATE INDEX IF NOT EXISTS idx_partner_comm_partner ON partner_communication_settings(partner_company_id);

-- ============================================================================
-- 7. MESSAGE READ RECEIPTS TABLE
-- ============================================================================
-- Track when users/drivers have read specific messages

CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,

  read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One receipt per message per user/driver
  CONSTRAINT unique_user_receipt UNIQUE (message_id, user_id),
  CONSTRAINT unique_driver_receipt UNIQUE (message_id, driver_id),
  CONSTRAINT must_have_reader CHECK (user_id IS NOT NULL OR driver_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON message_read_receipts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_driver ON message_read_receipts(driver_id) WHERE driver_id IS NOT NULL;

-- ============================================================================
-- 8. CONVERSATION ACTIVITY LOG TABLE
-- ============================================================================
-- Audit trail for conversation-related actions

CREATE TABLE IF NOT EXISTS conversation_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Actor
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,

  -- Action details
  action TEXT NOT NULL, -- 'participant_added', 'participant_removed', 'visibility_changed', etc.
  details JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conv_activity_conversation ON conversation_activity_log(conversation_id, created_at DESC);

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user can read a conversation
CREATE OR REPLACE FUNCTION can_user_read_conversation(
  p_user_id UUID,
  p_conversation_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
      AND can_read = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can write to a conversation
CREATE OR REPLACE FUNCTION can_user_write_conversation(
  p_user_id UUID,
  p_conversation_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
      AND can_write = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a driver can read a conversation
CREATE OR REPLACE FUNCTION can_driver_read_conversation(
  p_driver_id UUID,
  p_conversation_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
      AND driver_id = p_driver_id
      AND can_read = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a driver can write to a conversation
CREATE OR REPLACE FUNCTION can_driver_write_conversation(
  p_driver_id UUID,
  p_conversation_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_driver_id
      AND driver_id = p_driver_id
      AND can_write = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create a conversation for a load
CREATE OR REPLACE FUNCTION get_or_create_load_conversation(
  p_load_id UUID,
  p_conversation_type conversation_type,
  p_owner_company_id UUID,
  p_partner_company_id UUID DEFAULT NULL,
  p_created_by_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Check if conversation already exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE load_id = p_load_id
    AND type = p_conversation_type
    AND owner_company_id = p_owner_company_id;

  -- Create if not exists
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      type, owner_company_id, load_id,
      carrier_company_id, partner_company_id,
      created_by_user_id
    ) VALUES (
      p_conversation_type, p_owner_company_id, p_load_id,
      CASE WHEN p_conversation_type = 'load_shared' THEN p_owner_company_id ELSE NULL END,
      p_partner_company_id,
      p_created_by_user_id
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation stats after new message
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation with last message info
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 100),
    message_count = message_count + 1,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  -- Increment unread count for all participants except sender
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND can_read = TRUE
    AND (
      (user_id IS NOT NULL AND user_id != COALESCE(NEW.sender_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
      OR
      (driver_id IS NOT NULL AND driver_id != COALESCE(NEW.sender_driver_id, '00000000-0000-0000-0000-000000000000'::uuid))
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message stats
DROP TRIGGER IF EXISTS trigger_update_conversation_stats ON messages;
CREATE TRIGGER trigger_update_conversation_stats
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_stats();

-- Function to mark conversation as read for a user
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_driver_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    UPDATE conversation_participants
    SET
      unread_count = 0,
      last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;
  ELSIF p_driver_id IS NOT NULL THEN
    UPDATE conversation_participants
    SET
      unread_count = 0,
      last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
      AND driver_id = p_driver_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add participant to conversation with proper permissions
CREATE OR REPLACE FUNCTION add_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_driver_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL,
  p_role conversation_participant_role DEFAULT 'dispatcher',
  p_can_read BOOLEAN DEFAULT TRUE,
  p_can_write BOOLEAN DEFAULT TRUE,
  p_added_by_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_participant_id UUID;
  v_is_driver BOOLEAN;
BEGIN
  v_is_driver := p_driver_id IS NOT NULL OR p_role = 'driver';

  INSERT INTO conversation_participants (
    conversation_id, user_id, driver_id, company_id,
    role, can_read, can_write, is_driver, added_by_user_id
  ) VALUES (
    p_conversation_id, p_user_id, p_driver_id, p_company_id,
    p_role, p_can_read, p_can_write, v_is_driver, p_added_by_user_id
  )
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    can_read = p_can_read,
    can_write = p_can_write,
    updated_at = NOW()
  RETURNING id INTO v_participant_id;

  RETURN v_participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply driver visibility to a conversation
CREATE OR REPLACE FUNCTION apply_driver_visibility(
  p_conversation_id UUID,
  p_driver_id UUID,
  p_visibility driver_visibility_level,
  p_company_id UUID,
  p_added_by_user_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  CASE p_visibility
    WHEN 'none' THEN
      -- Remove driver from conversation
      DELETE FROM conversation_participants
      WHERE conversation_id = p_conversation_id
        AND driver_id = p_driver_id;

    WHEN 'read_only' THEN
      -- Add/update driver with read-only access
      PERFORM add_conversation_participant(
        p_conversation_id, NULL, p_driver_id, p_company_id,
        'driver', TRUE, FALSE, p_added_by_user_id
      );

    WHEN 'full' THEN
      -- Add/update driver with full access
      PERFORM add_conversation_participant(
        p_conversation_id, NULL, p_driver_id, p_company_id,
        'driver', TRUE, TRUE, p_added_by_user_id
      );
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_participants_updated_at ON conversation_participants;
CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_load_comm_settings_updated_at ON load_communication_settings;
CREATE TRIGGER update_load_comm_settings_updated_at
  BEFORE UPDATE ON load_communication_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_comm_settings_updated_at ON partner_communication_settings;
CREATE TRIGGER update_partner_comm_settings_updated_at
  BEFORE UPDATE ON partner_communication_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE conversations IS 'Contextual communication threads tied to loads, trips, or company relationships';
COMMENT ON TABLE conversation_participants IS 'Single source of truth for conversation access permissions';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE load_communication_settings IS 'Per-load driver visibility settings for shared conversations';
COMMENT ON TABLE partner_communication_settings IS 'Default communication policies between carrier and partner companies';
COMMENT ON TABLE message_read_receipts IS 'Track when users have read specific messages';
COMMENT ON TABLE conversation_activity_log IS 'Audit trail for conversation-related actions';

COMMENT ON COLUMN conversation_participants.can_read IS 'Whether participant can view messages in this conversation';
COMMENT ON COLUMN conversation_participants.can_write IS 'Whether participant can send messages in this conversation';
COMMENT ON COLUMN load_communication_settings.driver_visibility IS 'none=hidden, read_only=can see but not reply, full=can see and reply';
COMMENT ON COLUMN partner_communication_settings.lock_driver_visibility IS 'When true, carrier cannot override partner default visibility';
