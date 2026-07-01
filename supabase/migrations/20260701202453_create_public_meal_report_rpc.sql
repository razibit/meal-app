CREATE OR REPLACE FUNCTION public.get_public_global_meal_report(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  meal_date date,
  member_key text,
  member_name text,
  breakfast_count integer,
  lunch_count integer,
  dinner_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL
     OR p_end_date < p_start_date
     OR p_end_date - p_start_date > 366 THEN
    RAISE EXCEPTION 'Invalid report date range';
  END IF;

  RETURN QUERY
  WITH relevant_members AS (
    SELECT m.id, m.name
    FROM public.members m
    WHERE m.active = true
       OR EXISTS (
         SELECT 1 FROM public.meals historical
         WHERE historical.member_id = m.id
           AND historical.meal_date BETWEEN p_start_date AND p_end_date
       )
  )
  SELECT
    day.value::date,
    md5(member.id::text),
    member.name,
    COALESCE(SUM(meal.quantity) FILTER (WHERE meal.period = 'breakfast'), 0)::integer,
    COALESCE(SUM(meal.quantity) FILTER (WHERE meal.period = 'lunch'), 0)::integer,
    COALESCE(SUM(meal.quantity) FILTER (WHERE meal.period = 'dinner'), 0)::integer
  FROM generate_series(p_start_date, p_end_date, interval '1 day') AS day(value)
  CROSS JOIN relevant_members member
  LEFT JOIN public.meals meal
    ON meal.member_id = member.id
   AND meal.meal_date = day.value::date
  GROUP BY day.value, member.id, member.name
  ORDER BY day.value, member.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_global_meal_report(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_global_meal_report(date, date) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_global_meal_report(date, date) IS
  'Read-only public projection of member names and meal counts. Does not expose contact details or permit writes.';
