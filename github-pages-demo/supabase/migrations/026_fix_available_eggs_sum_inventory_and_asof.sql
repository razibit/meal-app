-- ============================================
-- Migration: Fix get_available_eggs (sum inventory additions + as-of date)
-- Purpose:
--   1) Treat egg_inventory rows as additions (sum them), so multiple updates
--      like 24 + 50 correctly total to 74.
--   2) Use a caller-supplied as-of date to avoid UTC CURRENT_DATE drift.
--   3) Use the member's configured meal-month dates if set; otherwise default
--      to 6th→5th logic anchored on the as-of date.
--
-- Root causes addressed:
--   - Old function used only the latest egg_inventory row.
--   - Old function used CURRENT_DATE (UTC), causing off-by-one day around TZ.
-- ============================================

-- Remove older versions
DROP FUNCTION IF EXISTS get_available_eggs(date, date);
DROP FUNCTION IF EXISTS get_available_eggs(date);

CREATE OR REPLACE FUNCTION get_available_eggs(
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start               date;
  v_end                 date;
  v_total_added         integer;
  v_consumed            integer;
  v_member_start        date;
  v_member_end          date;
  v_cutoff_date         date;
BEGIN
  -- Cap calculations at the meal-month end and the requested as-of date
  v_cutoff_date := p_as_of_date;

  -- If the caller has configured custom meal-month dates, use them.
  -- Otherwise fall back to default 6th→5th anchored on p_as_of_date.
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

  -- Only count up to the end of the period
  v_cutoff_date := LEAST(v_end, v_cutoff_date);

  -- Sum all inventory additions inside the period up to the cutoff date
  SELECT COALESCE(SUM(ei.total_eggs), 0)
    INTO v_total_added
    FROM egg_inventory ei
   WHERE (ei.created_at::date) >= v_start
     AND (ei.created_at::date) <= v_cutoff_date;

  -- Sum all consumption inside the period up to the cutoff date
  SELECT COALESCE(SUM(e.quantity), 0)
    INTO v_consumed
    FROM eggs e
   WHERE e.egg_date >= v_start
     AND e.egg_date <= v_cutoff_date;

  RETURN GREATEST(v_total_added - v_consumed, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_eggs(date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_eggs(date) TO service_role;
