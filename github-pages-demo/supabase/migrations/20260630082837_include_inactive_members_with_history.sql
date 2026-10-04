-- Historical meals remain reportable and billable after a member is deactivated.
CREATE OR REPLACE FUNCTION get_global_monthly_report_with_dates(p_start_date date, p_end_date date)
RETURNS TABLE (meal_date date, member_id uuid, member_name text, breakfast_count integer, lunch_count integer, dinner_count integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH relevant_members AS (
    SELECT m.id, m.name
    FROM members m
    WHERE m.active = true
       OR EXISTS (
         SELECT 1 FROM meals me
         WHERE me.member_id = m.id AND me.meal_date BETWEEN p_start_date AND p_end_date
       )
  )
  SELECT d::date, m.id, m.name,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'breakfast'), 0)::integer,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'lunch'), 0)::integer,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'dinner'), 0)::integer
  FROM generate_series(p_start_date, p_end_date, interval '1 day') d
  CROSS JOIN relevant_members m
  LEFT JOIN meals me ON me.member_id = m.id AND me.meal_date = d::date
  GROUP BY d, m.id, m.name
  ORDER BY d, m.name;
$$;
GRANT EXECUTE ON FUNCTION get_global_monthly_report_with_dates(date,date) TO authenticated;
