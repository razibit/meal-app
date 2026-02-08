-- ============================================
-- Migration: Add validation to prevent over-consumption of eggs
-- Purpose: Ensure the total eggs consumed in a period never exceeds available inventory
--
-- This trigger checks before INSERT/UPDATE on the eggs table to make sure
-- cumulative consumption (including this transaction) doesn't exceed available eggs.
-- ============================================

CREATE OR REPLACE FUNCTION check_available_eggs_constraint()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start                  date;
  v_end                    date;
  v_total_inventory        integer;
  v_consumed_after_insert  integer;
  v_this_period_start      date;
  v_this_period_end        date;
BEGIN
  -- ── 1. Resolve the meal-month period (default 6th→5th) ──────────
  IF EXTRACT(DAY FROM NEW.egg_date) < 6 THEN
    v_this_period_start := date_trunc('month', NEW.egg_date)::date - interval '1 month' + interval '5 days';
    v_this_period_end   := date_trunc('month', NEW.egg_date)::date + 4;
  ELSE
    v_this_period_start := date_trunc('month', NEW.egg_date)::date + 5;
    v_this_period_end   := (date_trunc('month', NEW.egg_date) + interval '1 month')::date + 4;
  END IF;

  -- ── 2. Get latest inventory total ───────────────────────────────
  SELECT COALESCE(ei.total_eggs, 0)
    INTO v_total_inventory
    FROM egg_inventory ei
   ORDER BY ei.created_at DESC
   LIMIT 1;

  -- ── 3. Calculate cumulative consumption including this transaction
  -- Sum all eggs consumed in this period up to the egg_date of this transaction,
  -- but include NEW.quantity (the quantity being inserted/updated)
  SELECT COALESCE(SUM(e.quantity), 0) + NEW.quantity
    INTO v_consumed_after_insert
    FROM eggs e
   WHERE e.egg_date >= v_this_period_start
     AND e.egg_date <= NEW.egg_date
     AND NOT (e.member_id = NEW.member_id AND e.egg_date = NEW.egg_date);  -- Exclude the current row (if updating)

  -- ── 4. Prevent over-consumption ─────────────────────────────────
  IF v_consumed_after_insert > v_total_inventory THEN
    RAISE EXCEPTION
      'Cannot take % eggs on %: Only % available in period (period: % to %)',
      NEW.quantity,
      NEW.egg_date,
      v_total_inventory - (v_consumed_after_insert - NEW.quantity),
      v_this_period_start,
      v_this_period_end;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS eggs_check_available_before_insert_update ON eggs;

-- Create or replace the trigger
CREATE TRIGGER eggs_check_available_before_insert_update
  BEFORE INSERT OR UPDATE ON eggs
  FOR EACH ROW
  EXECUTE FUNCTION check_available_eggs_constraint();
