-- ============================================
-- Function: get_monthly_report
-- Purpose: Aggregate meal data for monthly reporting
-- ============================================

CREATE OR REPLACE FUNCTION get_monthly_report(target_month text)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  morning_count bigint,
  night_count bigint,
  monthly_total bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as member_id,
    m.name as member_name,
    COUNT(*) FILTER (WHERE me.period = 'morning') as morning_count,
    COUNT(*) FILTER (WHERE me.period = 'night') as night_count,
    COUNT(*) as monthly_total
  FROM members m
  LEFT JOIN meals me ON me.member_id = m.id
    AND date_trunc('month', me.meal_date) = date_trunc('month', target_month::date)
  GROUP BY m.id, m.name
  ORDER BY m.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_monthly_report(text) TO authenticated;

-- ============================================
-- Additional performance indexes
-- ============================================

-- Composite index for meal queries by date and member
CREATE INDEX IF NOT EXISTS idx_meals_date_member_period 
  ON meals(meal_date, member_id, period);

-- Index for meal_details queries by date range
CREATE INDEX IF NOT EXISTS idx_meal_details_date_range 
  ON meal_details(meal_date DESC);

-- Index for recent chats (ordered by created_at for efficient queries)
-- Note: Removed time-based WHERE clause as now() is not IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_chats_recent 
  ON chats(created_at DESC);

-- Index for violation messages
CREATE INDEX IF NOT EXISTS idx_chats_violations 
  ON chats(created_at DESC) 
  WHERE is_violation = true;

-- Composite index for member meals in date range
CREATE INDEX IF NOT EXISTS idx_meals_member_date_range 
  ON meals(member_id, meal_date DESC);

-- ============================================
-- Helper function: get_today_meal_counts
-- Purpose: Get meal counts for today with rice preferences
-- ============================================

CREATE OR REPLACE FUNCTION get_today_meal_counts(target_date date, meal_period meal_period)
RETURNS TABLE (
  total_count bigint,
  boiled_rice_count bigint,
  atop_rice_count bigint,
  participants jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE m.rice_preference = 'boiled') as boiled_rice_count,
    COUNT(*) FILTER (WHERE m.rice_preference = 'atop') as atop_rice_count,
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'rice_preference', m.rice_preference
      )
    ) as participants
  FROM meals me
  JOIN members m ON m.id = me.member_id
  WHERE me.meal_date = target_date
    AND me.period = meal_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_today_meal_counts(date, meal_period) TO authenticated;

-- ============================================
-- Function: check_meal_exists
-- Purpose: Check if a meal registration already exists
-- ============================================

CREATE OR REPLACE FUNCTION check_meal_exists(
  p_member_id uuid,
  p_meal_date date,
  p_period meal_period
)
RETURNS boolean AS $$
DECLARE
  meal_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM meals
    WHERE member_id = p_member_id
      AND meal_date = p_meal_date
      AND period = p_period
  ) INTO meal_exists;
  
  RETURN meal_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_meal_exists(uuid, date, meal_period) TO authenticated;

-- ============================================
-- Function: get_member_monthly_summary
-- Purpose: Get detailed monthly summary for a specific member
-- ============================================

CREATE OR REPLACE FUNCTION get_member_monthly_summary(
  p_member_id uuid,
  p_month text
)
RETURNS TABLE (
  meal_date date,
  morning_registered boolean,
  night_registered boolean,
  daily_total integer
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      date_trunc('month', p_month::date),
      date_trunc('month', p_month::date) + interval '1 month' - interval '1 day',
      interval '1 day'
    )::date as d
  )
  SELECT 
    ds.d as meal_date,
    EXISTS(
      SELECT 1 FROM meals 
      WHERE member_id = p_member_id 
        AND meal_date = ds.d 
        AND period = 'morning'
    ) as morning_registered,
    EXISTS(
      SELECT 1 FROM meals 
      WHERE member_id = p_member_id 
        AND meal_date = ds.d 
        AND period = 'night'
    ) as night_registered,
    (
      SELECT COUNT(*)::integer FROM meals 
      WHERE member_id = p_member_id 
        AND meal_date = ds.d
    ) as daily_total
  FROM date_series ds
  ORDER BY ds.d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_member_monthly_summary(uuid, text) TO authenticated;
