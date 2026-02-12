-- ============================================
-- Seed Data for Development and Testing
-- ============================================
-- This file contains sample data for testing the Mess Meal Management System
-- WARNING: This will create test users. Do not run in production!

-- Note: In a real setup, users would be created through Supabase Auth
-- This seed assumes you have created auth users first
-- For testing, you can create users via the Supabase dashboard or Auth API

-- ============================================
-- Sample Members Data
-- ============================================
-- Replace these UUIDs with actual auth.users IDs from your Supabase project

-- Example: Insert sample members (update with real auth user IDs)
-- INSERT INTO members (id, name, email, phone, rice_preference, role) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'John Doe', 'john@example.com', '+8801712345601', 'boiled', 'admin'),
-- ('00000000-0000-0000-0000-000000000002', 'Jane Smith', 'jane@example.com', '+8801712345602', 'atop', 'member'),
-- ('00000000-0000-0000-0000-000000000003', 'Bob Johnson', 'bob@example.com', '+8801712345603', 'boiled', 'member'),
-- ('00000000-0000-0000-0000-000000000004', 'Alice Williams', 'alice@example.com', '+8801712345604', 'atop', 'member'),
-- ('00000000-0000-0000-0000-000000000005', 'Charlie Brown', 'charlie@example.com', '+8801712345605', 'boiled', 'member'),
-- ('00000000-0000-0000-0000-000000000006', 'Diana Prince', 'diana@example.com', '+8801712345606', 'atop', 'member'),
-- ('00000000-0000-0000-0000-000000000007', 'Ethan Hunt', 'ethan@example.com', '+8801712345607', 'boiled', 'member'),
-- ('00000000-0000-0000-0000-000000000008', 'Fiona Green', 'fiona@example.com', '+8801712345608', 'boiled', 'member'),
-- ('00000000-0000-0000-0000-000000000009', 'George Miller', 'george@example.com', '+8801712345609', 'atop', 'member'),
-- ('00000000-0000-0000-0000-000000000010', 'Hannah Lee', 'hannah@example.com', '+8801712345610', 'boiled', 'member'),
-- ('00000000-0000-0000-0000-000000000011', 'Ian Malcolm', 'ian@example.com', '+8801712345611', 'atop', 'member'),
-- ('00000000-0000-0000-0000-000000000012', 'Julia Roberts', 'julia@example.com', '+8801712345612', 'boiled', 'member'),
-- ('00000000-0000-0000-0000-000000000013', 'Kevin Hart', 'kevin@example.com', '+8801712345613', 'boiled', 'member'),
-- ('00000000-0000-0000-0000-000000000014', 'Laura Palmer', 'laura@example.com', '+8801712345614', 'atop', 'member'),
-- ('00000000-0000-0000-0000-000000000015', 'Mike Ross', 'mike@example.com', '+8801712345615', 'boiled', 'member'),
-- ('00000000-0000-0000-0000-000000000016', 'Nina Simone', 'nina@example.com', '+8801712345616', 'atop', 'member');

INSERT INTO meal_details (meal_date, morning_details, night_details) VALUES
 (CURRENT_DATE, 'Rice, Dal, Fish Curry, Mixed Vegetables', 'Rice, Chicken Curry, Salad'),
 (CURRENT_DATE + INTERVAL '1 day', 'Rice, Dal, Egg Curry, Potato Fry', 'Rice, Beef Curry, Vegetables');

-- ============================================
-- Sample Meals (Registrations)
-- ============================================
-- Uncomment and update with real member IDs after creating auth users

-- Today's morning meals
-- INSERT INTO meals (member_id, meal_date, period) VALUES
-- ('00000000-0000-0000-0000-000000000001', CURRENT_DATE, 'morning'),
-- ('00000000-0000-0000-0000-000000000002', CURRENT_DATE, 'morning'),
-- ('00000000-0000-0000-0000-000000000003', CURRENT_DATE, 'morning'),
-- ('00000000-0000-0000-0000-000000000005', CURRENT_DATE, 'morning'),
-- ('00000000-0000-0000-0000-000000000007', CURRENT_DATE, 'morning'),
-- ('00000000-0000-0000-0000-000000000008', CURRENT_DATE, 'morning'),
-- ('00000000-0000-0000-0000-000000000010', CURRENT_DATE, 'morning'),
-- ('00000000-0000-0000-0000-000000000012', CURRENT_DATE, 'morning');

-- Today's night meals
-- INSERT INTO meals (member_id, meal_date, period) VALUES
-- ('00000000-0000-0000-0000-000000000001', CURRENT_DATE, 'night'),
-- ('00000000-0000-0000-0000-000000000002', CURRENT_DATE, 'night'),
-- ('00000000-0000-0000-0000-000000000004', CURRENT_DATE, 'night'),
-- ('00000000-0000-0000-0000-000000000006', CURRENT_DATE, 'night'),
-- ('00000000-0000-0000-0000-000000000007', CURRENT_DATE, 'night'),
-- ('00000000-0000-0000-0000-000000000009', CURRENT_DATE, 'night'),
-- ('00000000-0000-0000-0000-000000000011', CURRENT_DATE, 'night'),
-- ('00000000-0000-0000-0000-000000000013', CURRENT_DATE, 'night'),
-- ('00000000-0000-0000-0000-000000000015', CURRENT_DATE, 'night');

-- ============================================
-- Sample Chat Messages
-- ============================================
-- Uncomment and update with real member IDs

-- INSERT INTO chats (sender_id, message, mentions, is_violation) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'Good morning everyone!', '{}', false),
-- ('00000000-0000-0000-0000-000000000002', '@John Doe don''t forget to register for dinner!', ARRAY['00000000-0000-0000-0000-000000000001']::uuid[], false),
-- ('00000000-0000-0000-0000-000000000003', 'The food today was excellent!', '{}', false);

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify the seed data

-- Check members count
-- SELECT COUNT(*) as member_count FROM members;

-- Check today's meal registrations
-- SELECT 
--   period,
--   COUNT(*) as registration_count,
--   COUNT(*) FILTER (WHERE m.rice_preference = 'boiled') as boiled_count,
--   COUNT(*) FILTER (WHERE m.rice_preference = 'atop') as atop_count
-- FROM meals me
-- JOIN members m ON m.id = me.member_id
-- WHERE meal_date = CURRENT_DATE
-- GROUP BY period;

-- Check meal details
-- SELECT * FROM meal_details WHERE meal_date >= CURRENT_DATE;

-- Test monthly report function
-- SELECT * FROM get_monthly_report(to_char(CURRENT_DATE, 'YYYY-MM-01'));

-- Test today's meal counts
-- SELECT * FROM get_today_meal_counts(CURRENT_DATE, 'morning');
-- SELECT * FROM get_today_meal_counts(CURRENT_DATE, 'night');
