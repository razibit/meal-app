-- ============================================
-- Function: get_member_monthly_report
-- Purpose: Get detailed meal and egg report for a specific member for a month
-- ============================================

CREATE OR REPLACE FUNCTION get_member_monthly_report(
  p_member_id uuid,
  target_month text
)
RETURNS TABLE (
  meal_date date,
  morning_count integer,
  night_count integer,
  egg_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      date_trunc('month', target_month::date),
      date_trunc('month', target_month::date) + interval '1 month' - interval '1 day',
      interval '1 day'
    )::date as d
  )
  SELECT 
    ds.d as meal_date,
    COALESCE(
      (SELECT SUM(quantity)::integer FROM meals 
       WHERE member_id = p_member_id 
         AND meal_date = ds.d 
         AND period = 'morning'),
      0
    ) as morning_count,
    COALESCE(
      (SELECT SUM(quantity)::integer FROM meals 
       WHERE member_id = p_member_id 
         AND meal_date = ds.d 
         AND period = 'night'),
      0
    ) as night_count,
    COALESCE(
      (SELECT quantity FROM eggs 
       WHERE member_id = p_member_id 
         AND egg_date = ds.d),
      0
    ) as egg_count
  FROM date_series ds
  ORDER BY ds.d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_member_monthly_report(uuid, text) TO authenticated;

-- ============================================
-- Function: get_monthly_summary (Updated to include quantity)
-- Purpose: Get monthly summary with meal quantities instead of counts
-- ============================================

CREATE OR REPLACE FUNCTION get_monthly_summary(target_month text)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  morning_quantity bigint,
  night_quantity bigint,
  egg_quantity bigint,
  monthly_total bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as member_id,
    m.name as member_name,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'morning'), 0) as morning_quantity,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'night'), 0) as night_quantity,
    COALESCE(SUM(e.quantity), 0) as egg_quantity,
    COALESCE(SUM(me.quantity), 0) as monthly_total
  FROM members m
  LEFT JOIN meals me ON me.member_id = m.id
    AND date_trunc('month', me.meal_date) = date_trunc('month', target_month::date)
  LEFT JOIN eggs e ON e.member_id = m.id
    AND date_trunc('month', e.egg_date) = date_trunc('month', target_month::date)
  GROUP BY m.id, m.name
  ORDER BY m.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_monthly_summary(text) TO authenticated;
