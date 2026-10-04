-- ============================================
-- Migration: Add meal month date configuration to members table
-- Purpose: Allow members to configure custom meal management month dates
-- Default: 6th of one month to 5th of next month
-- ============================================

-- Add meal_month_start_date and meal_month_end_date columns to members table
ALTER TABLE members
ADD COLUMN meal_month_start_date date,
ADD COLUMN meal_month_end_date date;

-- Set default values for existing members (6th to 5th)
-- We'll set it to NULL initially and let the application handle the default logic
-- This allows flexibility for members to use calendar months if they prefer

-- Add a comment to document the feature
COMMENT ON COLUMN members.meal_month_start_date IS 'Start date of the member''s meal management month. NULL means use default (6th of current month).';
COMMENT ON COLUMN members.meal_month_end_date IS 'End date of the member''s meal management month. NULL means use default (5th of next month).';

-- Create an index for performance on date queries
CREATE INDEX idx_members_meal_month_dates ON members(meal_month_start_date, meal_month_end_date);
