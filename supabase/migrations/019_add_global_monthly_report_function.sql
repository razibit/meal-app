-- ============================================
-- Function: get_global_monthly_report_with_dates
-- Purpose: Get detailed meal and egg report for ALL members for a custom date range
-- Returns data in a format suitable for a global consolidated report
-- ============================================

CREATE OR REPLACE FUNCTION get_global_monthly_report_with_dates(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  meal_date date,
  member_id uuid,
  member_name text,
  morning_count integer,
  night_count integer,
  egg_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      p_start_date,
      p_end_date,
      interval '1 day'
    )::date AS d
  ),
  all_members AS (
    SELECT m.id, m.name
    FROM members m
    ORDER BY m.name
  ),
  date_member_cross AS (
    SELECT ds.d, am.id, am.name
    FROM date_series ds
    CROSS JOIN all_members am
  )
  SELECT
    dmc.d AS meal_date,
    dmc.id AS member_id,
    dmc.name AS member_name,
    COALESCE(
      (
        SELECT SUM(meals.quantity)::integer
        FROM meals
        WHERE meals.member_id = dmc.id
          AND meals.meal_date = dmc.d
          AND meals.period = 'morning'
      ),
      0
    ) AS morning_count,
    COALESCE(
      (
        SELECT SUM(meals.quantity)::integer
        FROM meals
        WHERE meals.member_id = dmc.id
          AND meals.meal_date = dmc.d
          AND meals.period = 'night'
      ),
      0
    ) AS night_count,
    COALESCE(
      (
        SELECT eggs.quantity
        FROM eggs
        WHERE eggs.member_id = dmc.id
          AND eggs.egg_date = dmc.d
      ),
      0
    ) AS egg_count
  FROM date_member_cross dmc
  ORDER BY dmc.d, dmc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_global_monthly_report_with_dates(date, date) TO authenticated;
