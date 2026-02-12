-- ============================================
-- Common Queries Reference
-- Quick reference for frequently used queries
-- ============================================

-- ============================================
-- MEMBER QUERIES
-- ============================================

-- Get all members
SELECT * FROM members ORDER BY name;

-- Get member by email
SELECT * FROM members WHERE email = 'user@example.com';

-- Update member profile
UPDATE members 
SET name = 'New Name', phone = '+8801712345678'
WHERE id = 'user-uuid-here';

-- Get member count by rice preference
SELECT rice_preference, COUNT(*) as count
FROM members
GROUP BY rice_preference;

-- ============================================
-- MEAL QUERIES
-- ============================================

-- Get today's meals
SELECT 
  m.name,
  m.rice_preference,
  me.period,
  me.created_at
FROM meals me
JOIN members m ON m.id = me.member_id
WHERE me.meal_date = CURRENT_DATE
ORDER BY me.period, m.name;

-- Get meal count for today by period
SELECT 
  period,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE m.rice_preference = 'boiled') as boiled,
  COUNT(*) FILTER (WHERE m.rice_preference = 'atop') as atop
FROM meals me
JOIN members m ON m.id = me.member_id
WHERE meal_date = CURRENT_DATE
GROUP BY period;

-- Check if specific member has registered for a meal
SELECT EXISTS(
  SELECT 1 FROM meals
  WHERE member_id = 'user-uuid-here'
    AND meal_date = CURRENT_DATE
    AND period = 'morning'
) as is_registered;

-- Get member's meal history for current month
SELECT 
  meal_date,
  period,
  created_at
FROM meals
WHERE member_id = 'user-uuid-here'
  AND date_trunc('month', meal_date) = date_trunc('month', CURRENT_DATE)
ORDER BY meal_date DESC, period;

-- Get meals for a date range
SELECT 
  m.name,
  me.meal_date,
  me.period
FROM meals me
JOIN members m ON m.id = me.member_id
WHERE me.meal_date BETWEEN '2025-10-01' AND '2025-10-31'
ORDER BY me.meal_date, me.period, m.name;

-- ============================================
-- MEAL DETAILS QUERIES
-- ============================================

-- Get today's meal details
SELECT * FROM meal_details WHERE meal_date = CURRENT_DATE;

-- Get meal details for date range
SELECT 
  meal_date,
  morning_details,
  night_details,
  m.name as updated_by_name,
  updated_at
FROM meal_details md
LEFT JOIN members m ON m.id = md.updated_by
WHERE meal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY meal_date;

-- Update meal details
INSERT INTO meal_details (meal_date, morning_details, night_details, updated_by)
VALUES (CURRENT_DATE, 'Rice, Dal, Fish Curry', 'Rice, Chicken Curry', 'user-uuid-here')
ON CONFLICT (meal_date) 
DO UPDATE SET
  morning_details = EXCLUDED.morning_details,
  night_details = EXCLUDED.night_details,
  updated_by = EXCLUDED.updated_by,
  updated_at = now();

-- ============================================
-- CHAT QUERIES
-- ============================================

-- Get recent chat messages (last 50)
SELECT 
  c.id,
  c.message,
  c.mentions,
  c.is_violation,
  c.created_at,
  m.name as sender_name
FROM chats c
JOIN members m ON m.id = c.sender_id
ORDER BY c.created_at DESC
LIMIT 50;

-- Get messages mentioning specific user
SELECT 
  c.id,
  c.message,
  c.created_at,
  m.name as sender_name
FROM chats c
JOIN members m ON m.id = c.sender_id
WHERE 'user-uuid-here' = ANY(c.mentions)
ORDER BY c.created_at DESC;

-- Get violation messages
SELECT 
  c.id,
  c.message,
  c.created_at,
  m.name as sender_name
FROM chats c
JOIN members m ON m.id = c.sender_id
WHERE c.is_violation = true
ORDER BY c.created_at DESC;

-- Insert chat message
INSERT INTO chats (sender_id, message, mentions, is_violation)
VALUES (
  'user-uuid-here',
  'Hello @John',
  ARRAY['mentioned-user-uuid']::uuid[],
  false
);

-- Get chat statistics
SELECT 
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE is_violation = true) as violation_count,
  COUNT(DISTINCT sender_id) as active_members,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message
FROM chats;

-- ============================================
-- REPORTING QUERIES
-- ============================================

-- Monthly report for all members
SELECT * FROM get_monthly_report('2025-10-01');

-- Monthly report with additional calculations
SELECT 
  member_name,
  morning_count,
  night_count,
  monthly_total,
  ROUND(morning_count::numeric / NULLIF(monthly_total, 0) * 100, 1) as morning_percentage
FROM get_monthly_report('2025-10-01')
ORDER BY monthly_total DESC;

-- Member's detailed monthly summary
SELECT * FROM get_member_monthly_summary(
  'user-uuid-here'::uuid,
  '2025-10-01'
);

-- Today's meal counts with participants
SELECT * FROM get_today_meal_counts(CURRENT_DATE, 'morning');
SELECT * FROM get_today_meal_counts(CURRENT_DATE, 'night');

-- Weekly summary
SELECT 
  date_trunc('week', meal_date) as week,
  COUNT(*) as total_meals,
  COUNT(DISTINCT member_id) as unique_members,
  COUNT(*) FILTER (WHERE period = 'morning') as morning_meals,
  COUNT(*) FILTER (WHERE period = 'night') as night_meals
FROM meals
WHERE meal_date >= CURRENT_DATE - INTERVAL '4 weeks'
GROUP BY date_trunc('week', meal_date)
ORDER BY week DESC;

-- Member participation rate
SELECT 
  m.name,
  COUNT(me.id) as meals_registered,
  ROUND(COUNT(me.id)::numeric / (SELECT COUNT(*) FROM meals WHERE meal_date >= CURRENT_DATE - INTERVAL '30 days') * 100, 1) as participation_rate
FROM members m
LEFT JOIN meals me ON me.member_id = m.id 
  AND me.meal_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY m.id, m.name
ORDER BY meals_registered DESC;

-- Daily meal trend (last 30 days)
SELECT 
  meal_date,
  COUNT(*) FILTER (WHERE period = 'morning') as morning_count,
  COUNT(*) FILTER (WHERE period = 'night') as night_count,
  COUNT(*) as daily_total
FROM meals
WHERE meal_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY meal_date
ORDER BY meal_date DESC;

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- Clean up old chat messages (older than 90 days)
DELETE FROM chats 
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

-- Clean up old meal details (older than 1 year)
DELETE FROM meal_details 
WHERE meal_date < CURRENT_DATE - INTERVAL '1 year';

-- Vacuum and analyze tables for performance
VACUUM ANALYZE members;
VACUUM ANALYZE meals;
VACUUM ANALYZE meal_details;
VACUUM ANALYZE chats;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ============================================
-- DEBUGGING QUERIES
-- ============================================

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check current user and JWT claims
SELECT 
  current_user,
  current_setting('request.jwt.claims', true) as jwt_claims;

-- Test RLS as specific user (requires superuser)
-- SET ROLE authenticated;
-- SET request.jwt.claims = '{"sub": "user-uuid-here"}';
-- SELECT * FROM meals; -- Test query
-- RESET ROLE;

-- Check for duplicate meal registrations
SELECT 
  member_id,
  meal_date,
  period,
  COUNT(*) as count
FROM meals
GROUP BY member_id, meal_date, period
HAVING COUNT(*) > 1;

-- Check for orphaned records
SELECT 'meals' as table_name, COUNT(*) as orphaned_count
FROM meals me
WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.id = me.member_id)
UNION ALL
SELECT 'chats', COUNT(*)
FROM chats c
WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.id = c.sender_id);
