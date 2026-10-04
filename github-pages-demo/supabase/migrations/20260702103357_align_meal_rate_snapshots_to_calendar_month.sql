CREATE OR REPLACE FUNCTION public.calculate_and_store_meal_rate(p_trigger_source text DEFAULT 'manual')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date := date_trunc('month', current_date)::date;
  v_end date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_total_exp numeric;
  v_total_meals numeric(14, 2);
  v_rate numeric;
  v_last_rate numeric;
BEGIN
  IF NOT public.is_admin() AND p_trigger_source = 'manual' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

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

REVOKE ALL ON FUNCTION public.calculate_and_store_meal_rate(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_and_store_meal_rate(text) TO authenticated;

SELECT public.calculate_and_store_meal_rate('meals');
