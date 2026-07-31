-- Repair and expose the public carry-over report settings and anonymous-safe RPCs.

DROP FUNCTION IF EXISTS public.get_public_report_carry_over_visibility();
DROP FUNCTION IF EXISTS public.get_public_global_monthly_report_with_dates(date, date);
DROP FUNCTION IF EXISTS public.get_public_monthly_deposit_report_with_dates(date, date);
DROP FUNCTION IF EXISTS public.get_public_grocery_expense_report_with_dates(date, date);
DROP FUNCTION IF EXISTS public.get_public_latest_meal_rate(date, date);
DROP FUNCTION IF EXISTS public.get_public_meal_rate_history(date, date, integer);

ALTER TABLE public.public_report_settings
  ADD COLUMN IF NOT EXISTS show_monthly_totals_and_member_summary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_settlement_report boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_deposit_report boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_grocery_expense_report boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.get_public_report_carry_over_visibility()
RETURNS TABLE (
  show_settlement_report boolean,
  show_deposit_report boolean,
  show_grocery_expense_report boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT settings.show_settlement_report,
         settings.show_deposit_report,
         settings.show_grocery_expense_report
  FROM public.public_report_settings AS settings
  WHERE settings.id = true;
$$;

CREATE OR REPLACE FUNCTION public.get_public_global_monthly_report_with_dates(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  meal_date date,
  member_id text,
  member_name text,
  breakfast_count integer,
  lunch_count integer,
  dinner_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_public_monthly_deposit_report_with_dates(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  depositor_id uuid,
  depositor_name text,
  deposit_date timestamptz,
  added_by_name text,
  amount numeric,
  details text,
  total_amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH deposit_details AS (
    SELECT
      d.depositor_id,
      m1.name as depositor_name,
      d.deposit_date,
      m2.name as added_by_name,
      d.amount,
      d.details
    FROM public.deposits d
    JOIN public.members m1 ON d.depositor_id = m1.id
    JOIN public.members m2 ON d.added_by = m2.id
    WHERE d.deposit_date::date >= p_start_date
      AND d.deposit_date::date <= p_end_date
    ORDER BY m1.name, d.deposit_date
  ),
  totals AS (
    SELECT
      dd.depositor_id,
      SUM(dd.amount) as total_amount
    FROM deposit_details dd
    GROUP BY dd.depositor_id
  )
  SELECT
    dd.depositor_id,
    dd.depositor_name,
    dd.deposit_date,
    dd.added_by_name,
    dd.amount,
    dd.details,
    t.total_amount
  FROM deposit_details dd
  JOIN totals t ON dd.depositor_id = t.depositor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_grocery_expense_report_with_dates(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  expense_id uuid,
  expense_date timestamptz,
  added_by_id uuid,
  added_by_name text,
  shopper_id uuid,
  shopper_name text,
  transaction_type text,
  details text,
  amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ge.id as expense_id,
    ge.expense_date,
    ge.added_by as added_by_id,
    m_added.name as added_by_name,
    ge.shopper_id,
    m_shopper.name as shopper_name,
    ge.transaction_type,
    ge.details,
    ge.amount
  FROM public.grocery_expenses ge
  JOIN public.members m_added ON ge.added_by = m_added.id
  JOIN public.members m_shopper ON ge.shopper_id = m_shopper.id
  WHERE ge.expense_date::date >= p_start_date
    AND ge.expense_date::date <= p_end_date
  ORDER BY ge.expense_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_latest_meal_rate(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  meal_rate numeric,
  total_expenses numeric,
  total_meals integer,
  trigger_source text,
  period_start date,
  period_end date,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT h.meal_rate, h.total_expenses, h.total_meals, h.trigger_source, h.period_start, h.period_end, h.created_at
  FROM public.meal_rate_history h
  WHERE h.period_start = COALESCE(p_start_date, (SELECT p_start FROM public.get_current_meal_month()))
    AND h.period_end = COALESCE(p_end_date, (SELECT p_end FROM public.get_current_meal_month()))
  ORDER BY h.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_meal_rate_history(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  meal_rate numeric,
  total_expenses numeric,
  total_meals integer,
  trigger_source text,
  period_start date,
  period_end date,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT h.id, h.meal_rate, h.total_expenses, h.total_meals, h.trigger_source, h.period_start, h.period_end, h.created_at
  FROM public.meal_rate_history h
  WHERE h.period_start = COALESCE(p_start_date, (SELECT p_start FROM public.get_current_meal_month()))
    AND h.period_end = COALESCE(p_end_date, (SELECT p_end FROM public.get_current_meal_month()))
  ORDER BY h.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_report_carry_over_visibility() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_global_monthly_report_with_dates(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_monthly_deposit_report_with_dates(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_grocery_expense_report_with_dates(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_latest_meal_rate(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_meal_rate_history(date, date, integer) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
