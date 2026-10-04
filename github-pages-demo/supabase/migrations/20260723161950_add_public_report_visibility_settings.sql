-- Controls whether aggregate member totals are shown on the anonymous report link.
-- The default is deliberately private: only an active administrator can enable it.
CREATE TABLE public.public_report_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  show_monthly_totals_and_member_summary boolean NOT NULL DEFAULT false,
  show_settlement_report boolean NOT NULL DEFAULT false,
  show_deposit_report boolean NOT NULL DEFAULT false,
  show_grocery_expense_report boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_report_settings
  ADD COLUMN IF NOT EXISTS show_monthly_totals_and_member_summary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_settlement_report boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_deposit_report boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_grocery_expense_report boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

INSERT INTO public.public_report_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.public_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage public report visibility"
  ON public.public_report_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, UPDATE ON public.public_report_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_report_visibility()
RETURNS TABLE (show_monthly_totals_and_member_summary boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT settings.show_monthly_totals_and_member_summary
  FROM public.public_report_settings AS settings
  WHERE settings.id = true;
$$;

REVOKE ALL ON FUNCTION public.get_public_report_visibility() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_report_visibility() TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_report_visibility() IS
  'Anonymous-safe read of the administrator-controlled aggregate visibility setting.';

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

REVOKE ALL ON FUNCTION public.get_public_report_carry_over_visibility() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_report_carry_over_visibility() TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_report_carry_over_visibility() IS
  'Anonymous-safe read of the administrator-controlled carry-over report visibility settings.';
