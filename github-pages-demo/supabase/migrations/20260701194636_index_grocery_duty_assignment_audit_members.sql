CREATE INDEX idx_grocery_duty_created_by
  ON public.grocery_duty_assignments (created_by);

CREATE INDEX idx_grocery_duty_updated_by
  ON public.grocery_duty_assignments (updated_by);
