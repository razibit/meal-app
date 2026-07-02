-- Breakfast is half a meal; lunch and dinner are full meals.
ALTER TABLE meal_rate_history
  ALTER COLUMN total_meals TYPE numeric(14, 2) USING total_meals::numeric;

DROP FUNCTION IF EXISTS get_monthly_summary(text);
CREATE FUNCTION get_monthly_summary(target_month text)
RETURNS TABLE (member_id uuid, member_name text, breakfast_quantity numeric, lunch_quantity numeric, dinner_quantity numeric, monthly_total numeric)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT m.id, m.name,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'breakfast'), 0) * 0.5,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'lunch'), 0),
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'dinner'), 0),
    COALESCE(SUM(me.quantity * CASE me.period WHEN 'breakfast' THEN 0.5 ELSE 1 END), 0)
  FROM members m
  LEFT JOIN meals me ON me.member_id = m.id
    AND date_trunc('month', me.meal_date) = date_trunc('month', target_month::date)
  GROUP BY m.id, m.name ORDER BY m.name;
$$;

CREATE OR REPLACE FUNCTION calculate_and_store_meal_rate(p_trigger_source text DEFAULT 'manual')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date; v_end date; v_total_exp numeric; v_total_meals numeric(14, 2);
  v_rate numeric; v_last_rate numeric;
BEGIN
  IF NOT public.is_admin() AND p_trigger_source = 'manual' THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT p_start, p_end INTO v_start, v_end FROM get_current_meal_month();
  SELECT COALESCE(SUM(amount), 0) INTO v_total_exp FROM grocery_expenses WHERE expense_date BETWEEN v_start AND v_end;
  SELECT COALESCE(SUM(quantity * CASE period WHEN 'breakfast' THEN 0.5 ELSE 1 END), 0)
    INTO v_total_meals FROM meals WHERE meal_date BETWEEN v_start AND v_end;
  v_rate := CASE WHEN v_total_meals = 0 THEN 0 ELSE GREATEST(0, v_total_exp / v_total_meals) END;
  SELECT meal_rate INTO v_last_rate FROM meal_rate_history WHERE period_start = v_start AND period_end = v_end ORDER BY created_at DESC LIMIT 1;
  IF v_last_rate IS NOT NULL AND abs(v_last_rate - v_rate) < 0.01 THEN RETURN; END IF;
  INSERT INTO meal_rate_history (meal_rate, total_expenses, total_meals, trigger_source, period_start, period_end)
  VALUES (round(v_rate, 4), v_total_exp, v_total_meals, p_trigger_source, v_start, v_end);
END; $$;

DROP FUNCTION IF EXISTS get_latest_meal_rate(date, date);
CREATE FUNCTION get_latest_meal_rate(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE (meal_rate numeric, total_expenses numeric, total_meals numeric, trigger_source text, period_start date, period_end date, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT h.meal_rate, h.total_expenses, h.total_meals, h.trigger_source, h.period_start, h.period_end, h.created_at
  FROM meal_rate_history h
  WHERE h.period_start = COALESCE(p_start_date, (SELECT p_start FROM get_current_meal_month()))
    AND h.period_end = COALESCE(p_end_date, (SELECT p_end FROM get_current_meal_month()))
  ORDER BY h.created_at DESC LIMIT 1;
$$;

DROP FUNCTION IF EXISTS get_meal_rate_history(date, date, integer);
CREATE FUNCTION get_meal_rate_history(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL, p_limit integer DEFAULT 50)
RETURNS TABLE (id uuid, meal_rate numeric, total_expenses numeric, total_meals numeric, trigger_source text, period_start date, period_end date, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT h.id, h.meal_rate, h.total_expenses, h.total_meals, h.trigger_source, h.period_start, h.period_end, h.created_at
  FROM meal_rate_history h
  WHERE h.period_start = COALESCE(p_start_date, (SELECT p_start FROM get_current_meal_month()))
    AND h.period_end = COALESCE(p_end_date, (SELECT p_end FROM get_current_meal_month()))
  ORDER BY h.created_at DESC LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_monthly_summary(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_meal_rate(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_meal_rate_history(date, date, integer) TO authenticated;

-- Add a fresh weighted snapshot for the active period while retaining history.
DO $$
DECLARE v_start date; v_end date; v_expenses numeric; v_meals numeric;
BEGIN
  SELECT p_start, p_end INTO v_start, v_end FROM get_current_meal_month();
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses FROM grocery_expenses WHERE expense_date BETWEEN v_start AND v_end;
  SELECT COALESCE(SUM(quantity * CASE period WHEN 'breakfast' THEN 0.5 ELSE 1 END), 0)
    INTO v_meals FROM meals WHERE meal_date BETWEEN v_start AND v_end;
  INSERT INTO meal_rate_history (meal_rate, total_expenses, total_meals, trigger_source, period_start, period_end)
  VALUES (CASE WHEN v_meals = 0 THEN 0 ELSE round(v_expenses / v_meals, 4) END, v_expenses, v_meals, 'meals', v_start, v_end);
END $$;
