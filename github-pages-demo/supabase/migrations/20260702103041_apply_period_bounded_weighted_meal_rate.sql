-- Make the requested billing period, rather than the trigger snapshot period,
-- the source of truth for meal-rate and settlement calculations.
ALTER TABLE public.meal_rate_history
  ALTER COLUMN total_meals TYPE numeric(14, 2) USING total_meals::numeric;

DROP FUNCTION IF EXISTS public.get_latest_meal_rate(date, date);

CREATE OR REPLACE FUNCTION public.get_latest_meal_rate(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  meal_rate numeric,
  total_expenses numeric,
  total_meals numeric,
  trigger_source text,
  period_start date,
  period_end date,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH requested_period AS (
    SELECT
      COALESCE(p_start_date, (SELECT p_start FROM public.get_current_meal_month())) AS start_date,
      COALESCE(p_end_date, (SELECT p_end FROM public.get_current_meal_month())) AS end_date
  ), totals AS (
    SELECT
      period.start_date,
      period.end_date,
      COALESCE((
        SELECT SUM(expense.amount)
        FROM public.grocery_expenses expense
        WHERE expense.expense_date::date BETWEEN period.start_date AND period.end_date
      ), 0) AS expenses,
      COALESCE((
        SELECT SUM(meal.quantity * CASE meal.period WHEN 'breakfast' THEN 0.5 ELSE 1 END)
        FROM public.meals meal
        WHERE meal.meal_date BETWEEN period.start_date AND period.end_date
      ), 0) AS weighted_meals
    FROM requested_period period
    WHERE period.end_date >= period.start_date
      AND period.end_date - period.start_date <= 366
  )
  SELECT
    CASE WHEN totals.weighted_meals = 0 THEN 0
      ELSE totals.expenses / totals.weighted_meals END,
    totals.expenses,
    totals.weighted_meals,
    'live'::text,
    totals.start_date,
    totals.end_date,
    now()
  FROM totals;
$$;

-- Keep trigger-generated history weighted as well. History remains an audit log;
-- get_latest_meal_rate above is the authoritative period-bounded calculation.
CREATE OR REPLACE FUNCTION public.calculate_and_store_meal_rate(p_trigger_source text DEFAULT 'manual')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_total_exp numeric;
  v_total_meals numeric(14, 2);
  v_rate numeric;
  v_last_rate numeric;
BEGIN
  IF NOT public.is_admin() AND p_trigger_source = 'manual' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT p_start, p_end INTO v_start, v_end FROM public.get_current_meal_month();
  SELECT COALESCE(SUM(amount), 0) INTO v_total_exp
    FROM public.grocery_expenses WHERE expense_date::date BETWEEN v_start AND v_end;
  SELECT COALESCE(SUM(quantity * CASE period WHEN 'breakfast' THEN 0.5 ELSE 1 END), 0)
    INTO v_total_meals FROM public.meals WHERE meal_date BETWEEN v_start AND v_end;
  v_rate := CASE WHEN v_total_meals = 0 THEN 0 ELSE v_total_exp / v_total_meals END;

  SELECT meal_rate INTO v_last_rate FROM public.meal_rate_history
    WHERE period_start = v_start AND period_end = v_end ORDER BY created_at DESC LIMIT 1;
  IF v_last_rate IS NOT NULL AND abs(v_last_rate - v_rate) < 0.00000001 THEN RETURN; END IF;

  INSERT INTO public.meal_rate_history
    (meal_rate, total_expenses, total_meals, trigger_source, period_start, period_end)
  VALUES (v_rate, v_total_exp, v_total_meals, p_trigger_source, v_start, v_end);
END;
$$;

ALTER TABLE public.meal_rate_history DROP CONSTRAINT IF EXISTS meal_rate_history_trigger_source_check;
ALTER TABLE public.meal_rate_history ADD CONSTRAINT meal_rate_history_trigger_source_check
  CHECK (trigger_source IN ('meals', 'grocery_expenses', 'manual'));

REVOKE ALL ON FUNCTION public.get_latest_meal_rate(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_latest_meal_rate(date, date) TO authenticated;
