-- Remove all push notification infrastructure from the database.
-- This drops the trigger, function, RLS policies, and table.

-- 1. Drop trigger on chats table
DROP TRIGGER IF EXISTS trigger_notify_mentioned_users ON chats;

-- 2. Drop the trigger function
DROP FUNCTION IF EXISTS notify_mentioned_users() CASCADE;

-- 3. Drop RLS policies on push_subscriptions (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Members can view own subscriptions" ON push_subscriptions;
    DROP POLICY IF EXISTS "Members can create own subscriptions" ON push_subscriptions;
    DROP POLICY IF EXISTS "Members can update own subscriptions" ON push_subscriptions;
    DROP POLICY IF EXISTS "Members can delete own subscriptions" ON push_subscriptions;
  END IF;
END $$;

-- 4. Drop the push_subscriptions table
DROP TABLE IF EXISTS push_subscriptions CASCADE;
