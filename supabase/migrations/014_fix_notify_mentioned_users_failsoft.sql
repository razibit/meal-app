-- Fix chat mentions breaking inserts when push notification settings aren't configured.
--
-- Root cause: notify_mentioned_users() used current_setting('app.supabase_url') and
-- current_setting('app.supabase_service_role_key') without "missing_ok". When these
-- GUCs aren't set (common in new/prod projects unless explicitly configured), Postgres
-- raises an error, causing the INSERT into chats to fail.
--
-- This migration makes the trigger function fail-soft:
-- - Uses current_setting(..., true)
-- - Skips calling the Edge Function when config isn't present
-- - Wraps the HTTP call in an exception handler so notification failures never block chat

CREATE OR REPLACE FUNCTION notify_mentioned_users()
RETURNS TRIGGER AS $$
DECLARE
	sender_name TEXT;
	supabase_url TEXT;
	service_role_key TEXT;
BEGIN
	-- Only process if there are mentions
	IF COALESCE(array_length(NEW.mentions, 1), 0) = 0 THEN
		RETURN NEW;
	END IF;

	-- Get sender name (best-effort)
	SELECT name INTO sender_name
	FROM members
	WHERE id = NEW.sender_id;

	-- Fetch configuration safely (missing_ok = true)
	supabase_url := current_setting('app.supabase_url', true);
	service_role_key := current_setting('app.supabase_service_role_key', true);

	-- If config isn't available, skip notifications rather than failing the insert
	IF supabase_url IS NULL OR supabase_url = '' OR service_role_key IS NULL OR service_role_key = '' THEN
		RAISE NOTICE 'notify_mentioned_users: missing app.supabase_url/app.supabase_service_role_key; skipping';
		RETURN NEW;
	END IF;

	BEGIN
		PERFORM
			net.http_post(
				url := supabase_url || '/functions/v1/send-push-notification',
				headers := jsonb_build_object(
					'Content-Type', 'application/json',
					'Authorization', 'Bearer ' || service_role_key
				),
				body := jsonb_build_object(
					'chatId', NEW.id,
					'mentionedUserIds', NEW.mentions,
					'message', NEW.message,
					'senderName', COALESCE(sender_name, 'Someone')
				)
			);
	EXCEPTION WHEN OTHERS THEN
		-- Never block chat inserts due to notification failures
		RAISE NOTICE 'notify_mentioned_users failed: %', SQLERRM;
	END;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_mentioned_users() IS 'Triggers push notifications when users are mentioned in chat (fail-soft)';
