-- ============================================
-- Migration: Fix get_available_eggs to use cumulative period consumption
-- Purpose: Available eggs should decrease cumulatively within the meal month
--          period, not reset every day.
--
-- Problem:
--   The old function subtracted only eggs consumed on a single date.
--   If 12 eggs were added to inventory, available eggs reset to 12 each day.
--
-- Fix:
--   Subtract ALL eggs consumed from the meal-month period start up to today.
--   The function now accepts optional period_start / period_end dates.
--   When omitted it falls back to the default 6th→5th cycle.
--
-- "Taken" per member per day is unaffected — it already uses the `eggs`
--   table filtered on (member_id, egg_date).
-- ============================================

-- Drop the old single-parameter version so the new signature takes over
DROP FUNCTION IF EXISTS get_available_eggs(date);

CREATE OR REPLACE FUNCTION get_available_eggs(
  p_period_start date DEFAULT NULL,
  p_period_end   date DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start            date;
  v_end              date;
  total_in_inventory integer;
  consumed_in_period integer;
BEGIN
  -- ── 1. Resolve the meal-month period ─────────────────────────────
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    v_start := p_period_start;
    v_end   := p_period_end;
  ELSE
    -- Default: 6th of one month → 5th of the next
    IF EXTRACT(DAY FROM CURRENT_DATE) < 6 THEN
      -- Before the 6th ⇒ period is prev-month 6th → this-month 5th
      v_start := date_trunc('month', CURRENT_DATE)::date - interval '1 month' + interval '5 days';  -- 6th prev month
      v_end   := date_trunc('month', CURRENT_DATE)::date + 4;                                       -- 5th this month
    ELSE
      -- On or after the 6th ⇒ period is this-month 6th → next-month 5th
      v_start := date_trunc('month', CURRENT_DATE)::date + 5;                                       -- 6th this month
      v_end   := (date_trunc('month', CURRENT_DATE) + interval '1 month')::date + 4;                -- 5th next month
    END IF;
  END IF;

  -- ── 2. Latest inventory total ────────────────────────────────────
  SELECT COALESCE(ei.total_eggs, 0)
    INTO total_in_inventory
    FROM egg_inventory ei
   ORDER BY ei.created_at DESC
   LIMIT 1;

  -- ── 3. Cumulative consumption within the period (up to today) ────
  SELECT COALESCE(SUM(e.quantity), 0)
    INTO consumed_in_period
    FROM eggs e
   WHERE e.egg_date >= v_start
     AND e.egg_date <= LEAST(v_end, CURRENT_DATE);

  -- ── 4. Available = total − consumed (floored at 0) ──────────────
  RETURN GREATEST(total_in_inventory - consumed_in_period, 0);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_eggs(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_eggs(date, date) TO service_role;
