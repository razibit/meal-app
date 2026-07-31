-- Correct the public settlement snapshot to follow the calendar month.

CREATE OR REPLACE FUNCTION public.refresh_current_month_settlement_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start date;
  v_end date;
  v_rate numeric := 0;
  v_rows jsonb := '[]'::jsonb;
  v_total_meals numeric := 0;
  v_total_deposits numeric := 0;
  v_total_payable numeric := 0;
  v_total_receivable numeric := 0;
BEGIN
  SELECT
    date_trunc('month', current_date)::date,
    (date_trunc('month', current_date) + interval '1 month - 1 day')::date
  INTO v_start, v_end;

  SELECT COALESCE(h.meal_rate, 0)
    INTO v_rate
  FROM public.get_latest_meal_rate(v_start, v_end) AS h
  LIMIT 1;

  WITH member_meals AS (
    SELECT
      m.id AS member_id,
      m.name AS member_name,
      COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'breakfast'), 0)::numeric AS breakfast,
      COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'lunch'), 0)::numeric AS lunch,
      COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'dinner'), 0)::numeric AS dinner,
      COALESCE(SUM(me.quantity), 0)::numeric AS total_meals
    FROM public.members m
    LEFT JOIN public.meals me
      ON me.member_id = m.id
     AND me.meal_date BETWEEN v_start AND v_end
    WHERE m.active = true
       OR EXISTS (
         SELECT 1
         FROM public.meals historical
         WHERE historical.member_id = m.id
           AND historical.meal_date BETWEEN v_start AND v_end
       )
    GROUP BY m.id, m.name
  ),
  member_deposits AS (
    SELECT
      mm.member_id,
      COALESCE(SUM(d.amount), 0)::numeric AS deposit
    FROM member_meals mm
    LEFT JOIN public.deposits d
      ON d.depositor_id = mm.member_id
     AND d.accounting_date BETWEEN v_start AND v_end
    GROUP BY mm.member_id
  ),
  settlement_rows AS (
    SELECT
      mm.member_id,
      mm.member_name,
      mm.breakfast,
      mm.lunch,
      mm.dinner,
      mm.total_meals,
      COALESCE(md.deposit, 0)::numeric AS deposit,
      round((mm.total_meals * v_rate)::numeric, 2) AS meal_cost,
      round((mm.total_meals * v_rate - COALESCE(md.deposit, 0))::numeric, 2) AS balance
    FROM member_meals mm
    LEFT JOIN member_deposits md ON md.member_id = mm.member_id
    ORDER BY mm.member_name
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'memberId', member_id,
        'memberName', member_name,
        'meals', total_meals,
        'deposit', deposit,
        'mealCost', meal_cost,
        'balance', balance,
        'breakfast', breakfast,
        'lunch', lunch,
        'dinner', dinner
      )
      ORDER BY member_name
    ), '[]'::jsonb),
    COALESCE(SUM(total_meals), 0),
    COALESCE(SUM(deposit), 0),
    COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN balance < 0 THEN abs(balance) ELSE 0 END), 0)
  INTO v_rows, v_total_meals, v_total_deposits, v_total_payable, v_total_receivable
  FROM settlement_rows;

  INSERT INTO public.settlement_snapshots (
    period_start,
    period_end,
    meal_rate,
    settlement_rows,
    total_meals,
    total_deposits,
    total_payable,
    total_receivable,
    last_refreshed_at
  )
  VALUES (
    v_start,
    v_end,
    round(v_rate::numeric, 2),
    v_rows,
    v_total_meals,
    v_total_deposits,
    v_total_payable,
    v_total_receivable,
    now()
  )
  ON CONFLICT (period_start) DO UPDATE
  SET period_end = EXCLUDED.period_end,
      meal_rate = EXCLUDED.meal_rate,
      settlement_rows = EXCLUDED.settlement_rows,
      total_meals = EXCLUDED.total_meals,
      total_deposits = EXCLUDED.total_deposits,
      total_payable = EXCLUDED.total_payable,
      total_receivable = EXCLUDED.total_receivable,
      last_refreshed_at = EXCLUDED.last_refreshed_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_settlement_snapshot(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  period_start date,
  period_end date,
  meal_rate numeric,
  settlement_rows jsonb,
  total_meals numeric,
  total_deposits numeric,
  total_payable numeric,
  total_receivable numeric,
  last_refreshed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    s.period_start,
    s.period_end,
    s.meal_rate,
    s.settlement_rows,
    s.total_meals,
    s.total_deposits,
    s.total_payable,
    s.total_receivable,
    s.last_refreshed_at
  FROM public.settlement_snapshots s
  WHERE s.period_start = COALESCE(p_start_date, date_trunc('month', current_date)::date)
    AND s.period_end = COALESCE(p_end_date, (date_trunc('month', current_date) + interval '1 month - 1 day')::date)
  LIMIT 1;
$$;

SELECT public.refresh_current_month_settlement_snapshot();
