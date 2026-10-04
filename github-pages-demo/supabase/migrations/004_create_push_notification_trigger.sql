-- Create a function to trigger push notifications for chat mentions
-- This function will be called after a new chat message is inserted

CREATE OR REPLACE FUNCTION notify_mentioned_users()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only process if there are mentions
  IF array_length(NEW.mentions, 1) > 0 THEN
    -- Get sender name
    SELECT name INTO sender_name
    FROM members
    WHERE id = NEW.sender_id;

    -- Get Supabase function URL and service role key from environment
    -- Note: In production, these should be set via Supabase secrets
    -- For now, we'll use pg_net to call the Edge Function
    
    -- Call the Edge Function using pg_net extension
    -- The Edge Function will handle sending push notifications
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'chatId', NEW.id,
          'mentionedUserIds', NEW.mentions,
          'message', NEW.message,
          'senderName', COALESCE(sender_name, 'Someone')
        )
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on chats table
DROP TRIGGER IF EXISTS trigger_notify_mentioned_users ON chats;

CREATE TRIGGER trigger_notify_mentioned_users
  AFTER INSERT ON chats
  FOR EACH ROW
  EXECUTE FUNCTION notify_mentioned_users();

-- Add comment
COMMENT ON FUNCTION notify_mentioned_users() IS 'Triggers push notifications when users are mentioned in chat';
