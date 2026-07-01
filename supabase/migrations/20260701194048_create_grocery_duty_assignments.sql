CREATE TABLE public.grocery_duty_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_start_date date NOT NULL,
  billing_end_date date NOT NULL,
  duty_date date NOT NULL,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grocery_duty_valid_billing_period CHECK (billing_end_date >= billing_start_date),
  CONSTRAINT grocery_duty_date_in_period CHECK (
    duty_date >= billing_start_date AND duty_date <= billing_end_date
  ),
  CONSTRAINT grocery_duty_member_date_unique UNIQUE (billing_start_date, billing_end_date, duty_date, member_id)
);

CREATE INDEX idx_grocery_duty_billing_period
  ON public.grocery_duty_assignments (billing_start_date, billing_end_date, duty_date);
CREATE INDEX idx_grocery_duty_member
  ON public.grocery_duty_assignments (member_id, billing_start_date, billing_end_date);
CREATE INDEX idx_grocery_duty_created_by
  ON public.grocery_duty_assignments (created_by);
CREATE INDEX idx_grocery_duty_updated_by
  ON public.grocery_duty_assignments (updated_by);

CREATE TRIGGER update_grocery_duty_assignments_updated_at
  BEFORE UPDATE ON public.grocery_duty_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.grocery_duty_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read grocery duty assignments"
  ON public.grocery_duty_assignments FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can create grocery duty assignments"
  ON public.grocery_duty_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND created_by = (SELECT auth.uid()) AND updated_by = (SELECT auth.uid()));

CREATE POLICY "Admins can update grocery duty assignments"
  ON public.grocery_duty_assignments FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin() AND updated_by = (SELECT auth.uid()));

CREATE POLICY "Admins can delete grocery duty assignments"
  ON public.grocery_duty_assignments FOR DELETE TO authenticated
  USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_duty_assignments TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'grocery_duty_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_duty_assignments;
  END IF;
END $$;
