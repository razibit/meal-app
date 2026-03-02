-- ============================================
-- Migration: Create meal rate history table & auto-tracking triggers
-- Purpose: Store each newly calculated Meal Rate whenever underlying
--          data (grocery_expenses, meals, eggs, egg_price_config) changes.
--          Duplicate / unchanged rates are skipped (0.01 tolerance).
-- ============================================

-- 1. History table ---------------------------------------------------------
CREATE TABLE meal_rate_history (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_rate     numeric(12, 4) NOT NULL,          -- the computed rate (৳ per meal)
  total_expenses numeric(12, 2) NOT NULL DEFAULT 0, -- total grocery expenses in the period
  total_egg_cost numeric(12, 2) NOT NULL DEFAULT 0, -- total egg cost deducted
  total_meals   integer     NOT NULL DEFAULT 0,    -- denominator (morning + night quantities)
  total_eggs    integer     NOT NULL DEFAULT 0,    -- total eggs consumed
  egg_price     numeric(10, 2) NOT NULL DEFAULT 0, -- egg unit price at snapshot time
  trigger_source text       NOT NULL DEFAULT 'manual', -- meals | grocery_expenses | eggs | egg_price_config | manual
  period_start  date        NOT NULL,              -- meal-month start used for calc
  period_end    date        NOT NULL,              -- meal-month end used for calc
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_meal_rate_history_created   ON meal_rate_history(created_at DESC);
CREATE INDEX idx_meal_rate_history_period    ON meal_rate_history(period_start, period_end);

-- 2. RLS -------------------------------------------------------------------
ALTER TABLE meal_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view meal rate history"
  ON meal_rate_history FOR SELECT
  TO authenticated
  USING (true);

-- Only the trigger / server-side functions insert; no direct client inserts.
-- We still allow authenticated inserts so the RPC (SECURITY DEFINER) works,
-- but in practice the app never calls INSERT directly.
CREATE POLICY "Authenticated can insert meal rate history"
  ON meal_rate_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE meal_rate_history IS
  'Append-only ledger of every meal-rate recalculation. '
  'Rows are inserted automatically by DB triggers whenever meals, '
  'grocery_expenses, eggs, or egg_price_config change.';

-- 3. Helper: current meal-month date range ---------------------------------
--    Replicates the client-side getMealMonthDateRange() default logic
--    (6th → 5th). Custom per-member ranges are not used here because the
--    meal rate is a *global* figure shared by the whole dorm.
CREATE OR REPLACE FUNCTION get_current_meal_month(
  OUT p_start date,
  OUT p_end   date
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_today date := current_date;
  v_day   int  := extract(day from v_today);
BEGIN
  IF v_day < 6 THEN
    -- Before the 6th → period is prev-month 6th .. this-month 5th
    p_start := date_trunc('month', v_today) - interval '1 month' + interval '5 days';  -- prev month 6th
    p_end   := date_trunc('month', v_today) + interval '4 days';                        -- this month 5th
  ELSE
    -- On/after 6th → period is this-month 6th .. next-month 5th
    p_start := date_trunc('month', v_today) + interval '5 days';                        -- this month 6th
    p_end   := date_trunc('month', v_today) + interval '1 month' + interval '4 days';   -- next month 5th
  END IF;
END;
$$;

-- 4. Core recalculation function -------------------------------------------
CREATE OR REPLACE FUNCTION calculate_and_store_meal_rate(
  p_trigger_source text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start        date;
  v_end          date;
  v_total_exp    numeric;
  v_total_meals  integer;
  v_total_eggs   integer;
  v_egg_price    numeric;
  v_egg_cost     numeric;
  v_rate         numeric;
  v_last_rate    numeric;
BEGIN
  -- Determine current meal-month window
  SELECT p_start, p_end INTO v_start, v_end FROM get_current_meal_month();

  -- Total grocery expenses (cash + credit) in the window
  SELECT COALESCE(SUM(amount), 0)
    INTO v_total_exp
    FROM grocery_expenses
   WHERE expense_date >= v_start
     AND expense_date <= v_end;

  -- Total meal quantities in the window
  SELECT COALESCE(SUM(quantity), 0)::integer
    INTO v_total_meals
    FROM meals
   WHERE meal_date >= v_start
     AND meal_date <= v_end;

  -- Total egg consumption in the window
  SELECT COALESCE(SUM(quantity), 0)::integer
    INTO v_total_eggs
    FROM eggs
   WHERE egg_date >= v_start
     AND egg_date <= v_end;

  -- Latest egg price
  SELECT COALESCE(price_per_egg, 0)
    INTO v_egg_price
    FROM egg_price_config
   ORDER BY created_at DESC
   LIMIT 1;

  -- Compute
  v_egg_cost := v_total_eggs * v_egg_price;

  IF v_total_meals = 0 THEN
    v_rate := 0;
  ELSE
    v_rate := GREATEST(0, (v_total_exp - v_egg_cost) / v_total_meals);
  END IF;

  -- De-duplicate: skip if the latest record for the SAME period has an
  -- identical rate (within a 0.01 tolerance).
  SELECT meal_rate INTO v_last_rate
    FROM meal_rate_history
   WHERE period_start = v_start
     AND period_end   = v_end
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_last_rate IS NOT NULL AND abs(v_last_rate - v_rate) < 0.01 THEN
    -- Unchanged — nothing to store
    RETURN;
  END IF;

  -- Persist new snapshot
  INSERT INTO meal_rate_history (
    meal_rate, total_expenses, total_egg_cost,
    total_meals, total_eggs, egg_price,
    trigger_source, period_start, period_end
  ) VALUES (
    ROUND(v_rate, 4), v_total_exp, v_egg_cost,
    v_total_meals, v_total_eggs, v_egg_price,
    p_trigger_source, v_start, v_end
  );
END;
$$;

-- 5. Trigger functions (one per source table) ------------------------------

CREATE OR REPLACE FUNCTION trg_meal_rate_after_meals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM calculate_and_store_meal_rate('meals');
  RETURN NULL;  -- AFTER trigger, return value ignored
END;
$$;

CREATE OR REPLACE FUNCTION trg_meal_rate_after_grocery_expenses()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM calculate_and_store_meal_rate('grocery_expenses');
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION trg_meal_rate_after_eggs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM calculate_and_store_meal_rate('eggs');
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION trg_meal_rate_after_egg_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM calculate_and_store_meal_rate('egg_price_config');
  RETURN NULL;
END;
$$;

-- 6. Attach triggers -------------------------------------------------------

CREATE TRIGGER meal_rate_track_meals
  AFTER INSERT OR UPDATE OR DELETE ON meals
  FOR EACH STATEMENT EXECUTE FUNCTION trg_meal_rate_after_meals();

CREATE TRIGGER meal_rate_track_grocery_expenses
  AFTER INSERT OR UPDATE OR DELETE ON grocery_expenses
  FOR EACH STATEMENT EXECUTE FUNCTION trg_meal_rate_after_grocery_expenses();

CREATE TRIGGER meal_rate_track_eggs
  AFTER INSERT OR UPDATE OR DELETE ON eggs
  FOR EACH STATEMENT EXECUTE FUNCTION trg_meal_rate_after_eggs();

CREATE TRIGGER meal_rate_track_egg_price
  AFTER INSERT OR UPDATE OR DELETE ON egg_price_config
  FOR EACH STATEMENT EXECUTE FUNCTION trg_meal_rate_after_egg_price();

-- 7. Convenience RPC: fetch latest rate & history --------------------------

CREATE OR REPLACE FUNCTION get_latest_meal_rate(
  p_start_date date DEFAULT NULL,
  p_end_date   date DEFAULT NULL
)
RETURNS TABLE (
  meal_rate      numeric,
  total_expenses numeric,
  total_egg_cost numeric,
  total_meals    integer,
  total_eggs     integer,
  egg_price      numeric,
  trigger_source text,
  period_start   date,
  period_end     date,
  created_at     timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_start date;
  v_end   date;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    SELECT gm.p_start, gm.p_end INTO v_start, v_end FROM get_current_meal_month() gm;
  ELSE
    v_start := p_start_date;
    v_end   := p_end_date;
  END IF;

  RETURN QUERY
  SELECT h.meal_rate, h.total_expenses, h.total_egg_cost,
         h.total_meals, h.total_eggs, h.egg_price,
         h.trigger_source, h.period_start, h.period_end,
         h.created_at
    FROM meal_rate_history h
   WHERE h.period_start = v_start
     AND h.period_end   = v_end
   ORDER BY h.created_at DESC
   LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_meal_rate_history(
  p_start_date date DEFAULT NULL,
  p_end_date   date DEFAULT NULL,
  p_limit      integer DEFAULT 50
)
RETURNS TABLE (
  id             uuid,
  meal_rate      numeric,
  total_expenses numeric,
  total_egg_cost numeric,
  total_meals    integer,
  total_eggs     integer,
  egg_price      numeric,
  trigger_source text,
  period_start   date,
  period_end     date,
  created_at     timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_start date;
  v_end   date;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    SELECT gm.p_start, gm.p_end INTO v_start, v_end FROM get_current_meal_month() gm;
  ELSE
    v_start := p_start_date;
    v_end   := p_end_date;
  END IF;

  RETURN QUERY
  SELECT h.id, h.meal_rate, h.total_expenses, h.total_egg_cost,
         h.total_meals, h.total_eggs, h.egg_price,
         h.trigger_source, h.period_start, h.period_end,
         h.created_at
    FROM meal_rate_history h
   WHERE h.period_start = v_start
     AND h.period_end   = v_end
   ORDER BY h.created_at DESC
   LIMIT p_limit;
END;
$$;
