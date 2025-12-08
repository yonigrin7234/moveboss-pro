-- ============================================================================
-- ADD LAST MESSAGE SENDER NAME TO CONVERSATIONS
-- ============================================================================
-- Store the sender name alongside the message preview for better UX
-- ============================================================================

-- Add column for sender name
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS last_message_sender_name TEXT;

-- Update the trigger function to include sender name
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  -- Get sender name from profile or driver
  IF NEW.sender_user_id IS NOT NULL THEN
    SELECT full_name INTO v_sender_name
    FROM profiles
    WHERE id = NEW.sender_user_id;
  ELSIF NEW.sender_driver_id IS NOT NULL THEN
    SELECT CONCAT(first_name, ' ', last_name) INTO v_sender_name
    FROM drivers
    WHERE id = NEW.sender_driver_id;
  END IF;

  -- Update conversation with last message info
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 100),
    last_message_sender_name = COALESCE(v_sender_name, 'Unknown'),
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
