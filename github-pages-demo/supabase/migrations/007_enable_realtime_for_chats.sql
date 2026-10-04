-- Ensure Supabase Realtime is enabled for the chats table
--
-- Without this, clients can subscribe successfully but will never receive
-- postgres_changes events for INSERT/UPDATE/DELETE on public.chats.
--
-- This is safe to run repeatedly.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chats'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chats';
  END IF;
END $$;
