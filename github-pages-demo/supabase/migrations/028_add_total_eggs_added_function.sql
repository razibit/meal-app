-- ============================================
-- Migration: Add get_total_eggs_added (sum inventory additions for current period)
-- Purpose:
--   Preferences should show "total eggs added this period" (not latest entry).
--   Uses the same period semantics as get_available_eggs():
--   - Member custom meal-month dates if configured
--   - Otherwise default 6th→5th
--   - Uses caller-supplied as-of date to avoid UTC drift
-- ============================================

CREATE OR REPLACE FUNCTION get_total_eggs_added(
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start        date;
  v_end          date;
  v_member_start date;
  v_member_end   date;
  v_cutoff_date  date;
  v_total_added  integer;
BEGIN
  v_cutoff_date := p_as_of_date;

  IF auth.uid() IS NOT NULL THEN
    SELECT meal_month_start_date, meal_month_end_date
      INTO v_member_start, v_member_end
      FROM members
     WHERE id = auth.uid();
  END IF;

  IF v_member_start IS NOT NULL AND v_member_end IS NOT NULL THEN
    v_start := v_member_start;
    v_end   := v_member_end;
  ELSE
    IF EXTRACT(DAY FROM p_as_of_date) < 6 THEN
      v_start := (date_trunc('month', p_as_of_date)::date - interval '1 month' + interval '5 days')::date; -- 6th prev month
      v_end   := (date_trunc('month', p_as_of_date)::date + 4)::date;                                       -- 5th this month
    ELSE
      v_start := (date_trunc('month', p_as_of_date)::date + 5)::date;                                       -- 6th this month
      v_end   := ((date_trunc('month', p_as_of_date) + interval '1 month')::date + 4)::date;                -- 5th next month
    END IF;
  END IF;

  v_cutoff_date := LEAST(v_end, v_cutoff_date);

  SELECT COALESCE(SUM(ei.total_eggs), 0)
    INTO v_total_added
    FROM egg_inventory ei
   WHERE (ei.created_at::date) >= v_start
     AND (ei.created_at::date) <= v_cutoff_date;

  RETURN v_total_added;
END;
$$;

GRANT EXECUTE ON FUNCTION get_total_eggs_added(date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_eggs_added(date) TO service_role;
