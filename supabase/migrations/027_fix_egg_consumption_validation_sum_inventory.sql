-- ============================================
-- Migration: Fix egg consumption validation (sum inventory additions)
-- Purpose:
--   Enforce that cumulative eggs taken within the meal-month period up to
--   NEW.egg_date cannot exceed eggs added to inventory within that same period.
--
-- Root causes addressed:
--   - Previous trigger compared against ONLY the latest egg_inventory row.
--   - Needed to match the new get_available_eggs() semantics.
-- ============================================

CREATE OR REPLACE FUNCTION check_available_eggs_constraint()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start                 date;
  v_end                   date;
  v_member_start          date;
  v_member_end            date;
  v_total_added           integer;
  v_consumed_after_change integer;
  v_cutoff_date           date;
BEGIN
  -- Resolve custom meal-month dates for the member (if configured)
  SELECT meal_month_start_date, meal_month_end_date
    INTO v_member_start, v_member_end
    FROM members
   WHERE id = NEW.member_id;

  IF v_member_start IS NOT NULL AND v_member_end IS NOT NULL THEN
    v_start := v_member_start;
    v_end   := v_member_end;
  ELSE
    -- Default: 6th→5th anchored on NEW.egg_date
    IF EXTRACT(DAY FROM NEW.egg_date) < 6 THEN
      v_start := (date_trunc('month', NEW.egg_date)::date - interval '1 month' + interval '5 days')::date;
      v_end   := (date_trunc('month', NEW.egg_date)::date + 4)::date;
    ELSE
      v_start := (date_trunc('month', NEW.egg_date)::date + 5)::date;
      v_end   := ((date_trunc('month', NEW.egg_date) + interval '1 month')::date + 4)::date;
    END IF;
  END IF;

  v_cutoff_date := LEAST(v_end, NEW.egg_date);

  -- Sum inventory additions up to NEW.egg_date within the period
  SELECT COALESCE(SUM(ei.total_eggs), 0)
    INTO v_total_added
    FROM egg_inventory ei
   WHERE (ei.created_at::date) >= v_start
     AND (ei.created_at::date) <= v_cutoff_date;

  -- Sum consumption within the period up to NEW.egg_date, replacing the current row
  SELECT COALESCE(SUM(e.quantity), 0) + NEW.quantity
    INTO v_consumed_after_change
    FROM eggs e
   WHERE e.egg_date >= v_start
     AND e.egg_date <= v_cutoff_date
     AND NOT (e.member_id = NEW.member_id AND e.egg_date = NEW.egg_date);

  IF v_consumed_after_change > v_total_added THEN
    RAISE EXCEPTION
      'Cannot take % eggs on %: Only % available in period (period: % to %)',
      NEW.quantity,
      NEW.egg_date,
      GREATEST(v_total_added - (v_consumed_after_change - NEW.quantity), 0),
      v_start,
      v_end;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists and points at the updated function
DROP TRIGGER IF EXISTS eggs_check_available_before_insert_update ON eggs;

CREATE TRIGGER eggs_check_available_before_insert_update
  BEFORE INSERT OR UPDATE ON eggs
  FOR EACH ROW
  EXECUTE FUNCTION check_available_eggs_constraint();
