-- Use accounting_date for deposit-based financial calculations.
-- deposit_date remains the audit timestamp shown to users.

CREATE OR REPLACE FUNCTION public.get_member_total_deposit(
  p_member_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.deposits
  WHERE depositor_id = p_member_id
    AND accounting_date BETWEEN p_start_date AND p_end_date;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_deposit_report_with_dates(
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
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH deposit_details AS (
    SELECT
      d.depositor_id,
      dm.name AS depositor_name,
      d.deposit_date,
      am.name AS added_by_name,
      d.amount,
      d.details
    FROM public.deposits d
    JOIN public.members dm ON dm.id = d.depositor_id
    JOIN public.members am ON am.id = d.added_by
    WHERE d.accounting_date BETWEEN p_start_date AND p_end_date
    ORDER BY dm.name, d.accounting_date, d.created_at
  ),
  totals AS (
    SELECT
      dd.depositor_id,
      SUM(dd.amount) AS total_amount
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
  JOIN totals t ON t.depositor_id = dd.depositor_id;
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH deposit_details AS (
    SELECT
      d.depositor_id,
      dm.name AS depositor_name,
      d.deposit_date,
      am.name AS added_by_name,
      d.amount,
      d.details
    FROM public.deposits d
    JOIN public.members dm ON dm.id = d.depositor_id
    JOIN public.members am ON am.id = d.added_by
    WHERE d.accounting_date BETWEEN p_start_date AND p_end_date
    ORDER BY dm.name, d.accounting_date, d.created_at
  ),
  totals AS (
    SELECT
      dd.depositor_id,
      SUM(dd.amount) AS total_amount
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
  JOIN totals t ON t.depositor_id = dd.depositor_id;
$$;

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

GRANT EXECUTE ON FUNCTION public.get_member_total_deposit(uuid, date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_deposit_report_with_dates(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_monthly_deposit_report_with_dates(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_report_carry_over_visibility() TO anon, authenticated;
