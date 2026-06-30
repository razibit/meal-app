-- Preserve enough precision for aggregate settlement reconciliation.
CREATE OR REPLACE FUNCTION calculate_and_store_meal_rate(p_trigger_source text DEFAULT 'manual')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start date; v_end date; v_total_exp numeric; v_total_meals integer; v_rate numeric; v_last_rate numeric;
BEGIN
  IF NOT public.is_admin() AND p_trigger_source = 'manual' THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT p_start,p_end INTO v_start,v_end FROM get_current_meal_month();
  SELECT COALESCE(SUM(amount),0) INTO v_total_exp FROM grocery_expenses WHERE expense_date::date BETWEEN v_start AND v_end;
  SELECT COALESCE(SUM(quantity),0)::integer INTO v_total_meals FROM meals WHERE meal_date BETWEEN v_start AND v_end;
  v_rate := CASE WHEN v_total_meals=0 THEN 0 ELSE GREATEST(0,v_total_exp/v_total_meals) END;
  SELECT meal_rate INTO v_last_rate FROM meal_rate_history WHERE period_start=v_start AND period_end=v_end ORDER BY created_at DESC LIMIT 1;
  IF v_last_rate IS NOT NULL AND abs(v_last_rate-v_rate)<0.00000001 THEN RETURN; END IF;
  INSERT INTO meal_rate_history(meal_rate,total_expenses,total_meals,trigger_source,period_start,period_end)
  VALUES(round(v_rate,8),v_total_exp,v_total_meals,p_trigger_source,v_start,v_end);
END $$;

REVOKE ALL ON FUNCTION calculate_and_store_meal_rate(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION calculate_and_store_meal_rate(text) TO authenticated;
