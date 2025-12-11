-- Enable pg_net extension for HTTP calls from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to trigger push notifications when a message is inserted
-- This is a fallback for when messages are inserted directly (bypassing API route)
CREATE OR REPLACE FUNCTION notify_message_participants()
RETURNS TRIGGER AS $$
DECLARE
  api_url TEXT;
  service_key TEXT;
  payload JSONB;
BEGIN
  -- Get API URL and service key from environment (set via Supabase secrets)
  -- For now, construct API URL from Supabase URL
  api_url := current_setting('app.settings.api_url', true);
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- If not set, try to construct from Supabase URL
  IF api_url IS NULL OR api_url = '' THEN
    -- Try to get from Supabase project settings or use default pattern
    -- Note: This requires the API URL to be configured in Supabase secrets
    api_url := NULL; -- Will skip if not configured
  END IF;
  
  -- Only proceed if we have the necessary configuration
  IF api_url IS NULL OR service_key IS NULL THEN
    -- Log that notification should be sent but can't be triggered from DB
    -- The mobile app or API route should handle it instead
    RAISE NOTICE 'Message notification trigger: API URL or service key not configured. Notification should be sent by application layer.';
    RETURN NEW;
  END IF;
  
  -- Build payload
  payload := jsonb_build_object(
    'conversation_id', NEW.conversation_id,
    'sender_user_id', NEW.sender_user_id,
    'sender_driver_id', NEW.sender_driver_id,
    'message_preview', LEFT(NEW.body, 200)
  );
  
  -- Call notification endpoint asynchronously (non-blocking)
  -- This uses pg_net to make HTTP request
  PERFORM net.http_post(
    url := api_url || '/api/messaging/notify-message',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := payload::text
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the INSERT if notification fails
    RAISE WARNING 'Failed to trigger message notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_message_participants ON messages;
CREATE TRIGGER trigger_notify_message_participants
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_participants();

-- Note: To enable this trigger, set these Supabase secrets:
-- app.settings.api_url = 'https://your-domain.vercel.app' (or your API URL)
-- app.settings.service_role_key = 'your-service-role-key'
--
-- Alternatively, you can modify the function to read from a settings table
-- or environment variables if pg_net configuration differs
