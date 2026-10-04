-- Remove the public settlement snapshot feature and its supporting schema.

DROP TRIGGER IF EXISTS refresh_settlement_snapshot_on_meals ON public.meals;
DROP TRIGGER IF EXISTS refresh_settlement_snapshot_on_deposits ON public.deposits;
DROP TRIGGER IF EXISTS refresh_settlement_snapshot_on_grocery_expenses ON public.grocery_expenses;
DROP TRIGGER IF EXISTS refresh_settlement_snapshot_on_meal_rates ON public.meal_rate_history;

DROP FUNCTION IF EXISTS public.trigger_refresh_current_month_settlement_snapshot();
DROP FUNCTION IF EXISTS public.refresh_current_month_settlement_snapshot();
DROP FUNCTION IF EXISTS public.get_public_settlement_snapshot(date, date);

DROP TABLE IF EXISTS public.settlement_snapshots;

ALTER TABLE public.public_report_settings
  DROP COLUMN IF EXISTS show_settlement_report;

DROP FUNCTION IF EXISTS public.get_public_report_carry_over_visibility();

CREATE OR REPLACE FUNCTION public.get_public_report_carry_over_visibility()
RETURNS TABLE (
  show_deposit_report boolean,
  show_grocery_expense_report boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT settings.show_deposit_report,
         settings.show_grocery_expense_report
  FROM public.public_report_settings AS settings
  WHERE settings.id = true;
$$;

REVOKE ALL ON FUNCTION public.get_public_report_carry_over_visibility() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_report_carry_over_visibility() TO anon, authenticated;
