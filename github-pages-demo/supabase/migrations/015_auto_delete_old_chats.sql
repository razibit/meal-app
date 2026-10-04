-- Migration: Auto-delete chat messages older than 4 days
-- Description: Creates a function and scheduled job to permanently delete chat messages older than 4 days

-- Function to delete old chat messages (older than 4 days)
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete messages older than 4 days
  DELETE FROM chats
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Get count of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the deletion (optional, for monitoring)
  RAISE NOTICE 'Deleted % old chat messages', deleted_count;
  
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users (for manual testing if needed)
GRANT EXECUTE ON FUNCTION delete_old_chat_messages() TO authenticated;

-- Comment on the function
COMMENT ON FUNCTION delete_old_chat_messages() IS 
'Permanently deletes chat messages older than 30 days. Returns the count of deleted messages.';

-- Note: To set up automatic execution via pg_cron, run this on the database:
-- This requires the pg_cron extension and should be run by a superuser
-- 
-- Run this command as a superuser on your database:
-- SELECT cron.schedule(
--   'delete-old-chats',        -- job name
--   '0 2 * * *',               -- cron schedule (every day at 2 AM)
--   'SELECT delete_old_chat_messages();'
-- );
--
-- If you don't have pg_cron, you can:
-- 1. Use Supabase Edge Functions with a scheduled trigger
-- 2. Use external cron services (like GitHub Actions, Vercel Cron, etc.)
-- 3. Call the function manually on a schedule from your application
