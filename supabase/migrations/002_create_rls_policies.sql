-- Enable Row Level Security on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Members table RLS policies
-- ============================================

-- Members can view all profiles
CREATE POLICY "Members can view all profiles"
  ON members FOR SELECT
  USING (auth.role() = 'authenticated');

-- Members can update their own profile
CREATE POLICY "Members can update own profile"
  ON members FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Members can insert their own profile (for initial setup)
CREATE POLICY "Members can insert own profile"
  ON members FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- Meals table RLS policies
-- ============================================

-- Members can view all meals
CREATE POLICY "Members can view all meals"
  ON meals FOR SELECT
  USING (auth.role() = 'authenticated');

-- Members can insert their own meals
CREATE POLICY "Members can add own meals"
  ON meals FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- Members can delete their own meals
CREATE POLICY "Members can remove own meals"
  ON meals FOR DELETE
  USING (auth.uid() = member_id);

-- Members can update their own meals (if needed)
CREATE POLICY "Members can update own meals"
  ON meals FOR UPDATE
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- ============================================
-- Meal details table RLS policies
-- ============================================

-- All authenticated members can view meal details
CREATE POLICY "Members can view meal details"
  ON meal_details FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated members can insert meal details
CREATE POLICY "Members can insert meal details"
  ON meal_details FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- All authenticated members can update meal details
CREATE POLICY "Members can update meal details"
  ON meal_details FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- All authenticated members can delete meal details (if needed)
CREATE POLICY "Members can delete meal details"
  ON meal_details FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- Chats table RLS policies
-- ============================================

-- All authenticated members can view chats
CREATE POLICY "Members can view chats"
  ON chats FOR SELECT
  USING (auth.role() = 'authenticated');

-- Members can insert their own messages
CREATE POLICY "Members can send messages"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- ============================================
-- Push subscriptions table RLS policies
-- ============================================

-- Members can view their own subscriptions
CREATE POLICY "Members can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = member_id);

-- Members can insert their own subscriptions
CREATE POLICY "Members can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = member_id);

-- Members can update their own subscriptions
CREATE POLICY "Members can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- Members can delete their own subscriptions
CREATE POLICY "Members can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = member_id);
