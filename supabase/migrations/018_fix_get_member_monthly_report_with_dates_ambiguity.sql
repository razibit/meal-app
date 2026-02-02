-- Fix ambiguous column references in get_member_monthly_report_with_dates
-- Error observed: column reference "meal_date" is ambiguous (42702)

CREATE OR REPLACE FUNCTION get_member_monthly_report_with_dates(
  p_member_id uuid,
  p_start_date date,
  p_end_date date
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
      p_start_date,
      p_end_date,
      interval '1 day'
    )::date AS d
  )
  SELECT
    ds.d AS meal_date,
    COALESCE(
      (
        SELECT SUM(meals.quantity)::integer
        FROM meals
        WHERE meals.member_id = p_member_id
          AND meals.meal_date = ds.d
          AND meals.period = 'morning'
      ),
      0
    ) AS morning_count,
    COALESCE(
      (
        SELECT SUM(meals.quantity)::integer
        FROM meals
        WHERE meals.member_id = p_member_id
          AND meals.meal_date = ds.d
          AND meals.period = 'night'
      ),
      0
    ) AS night_count,
    COALESCE(
      (
        SELECT eggs.quantity
        FROM eggs
        WHERE eggs.member_id = p_member_id
          AND eggs.egg_date = ds.d
      ),
      0
    ) AS egg_count
  FROM date_series ds
  ORDER BY ds.d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_member_monthly_report_with_dates(uuid, date, date) TO authenticated;
