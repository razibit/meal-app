-- ============================================
-- Migration: Fix Auto Meal Materialization
-- Purpose: Fix period type mismatch (text vs meal_period enum) and
--          reschedule pg_cron jobs to call the corrected signatures.
--
-- Root cause:
-- - `meals.period` is `meal_period` ENUM.
-- - In migration 020, materialization functions accepted `text` and attempted
--   to insert that text into the enum column, which can fail at runtime.
-- ============================================

-- Ensure functions resolve to the intended schema when executed via pg_cron
-- (pg_cron can run with a minimal/altered search_path)

-- ============================================
-- Function: materialize_auto_meals(p_date, p_period)
-- ============================================

CREATE OR REPLACE FUNCTION materialize_auto_meals(
  p_date date,
  p_period meal_period
)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  quantity integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH inserted AS (
    INSERT INTO meals (member_id, meal_date, period, quantity)
    SELECT
      m.id,
      p_date,
      p_period,
      CASE
        WHEN p_period = 'morning' THEN m.auto_meal_morning_quantity
        ELSE m.auto_meal_night_quantity
      END
    FROM members m
    WHERE
      CASE
        WHEN p_period = 'morning' THEN m.auto_meal_morning = true
        ELSE m.auto_meal_night = true
      END
      AND CASE
        WHEN p_period = 'morning' THEN m.auto_meal_morning_quantity > 0
        ELSE m.auto_meal_night_quantity > 0
      END
      AND NOT EXISTS (
        SELECT 1
        FROM meals me
        WHERE me.member_id = m.id
          AND me.meal_date = p_date
          AND me.period = p_period
      )
    ON CONFLICT ON CONSTRAINT meals_member_id_meal_date_period_key DO NOTHING
    RETURNING meals.member_id, meals.quantity
  )
  SELECT
    i.member_id,
    m.name AS member_name,
    i.quantity
  FROM inserted i
  JOIN members m ON m.id = i.member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION materialize_auto_meals(date, meal_period) TO authenticated;
GRANT EXECUTE ON FUNCTION materialize_auto_meals(date, meal_period) TO service_role;

-- Backward-compatible wrapper (migration 020 created a text signature).
-- This keeps existing pg_cron commands like:
--   SELECT materialize_auto_meals_for_today('night')
-- working without requiring an immediate reschedule.
CREATE OR REPLACE FUNCTION materialize_auto_meals(
  p_date date,
  p_period text
)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  quantity integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_period meal_period;
BEGIN
  v_period := p_period::meal_period;
  RETURN QUERY
  SELECT *
  FROM materialize_auto_meals(p_date, v_period);
END;
$$;

GRANT EXECUTE ON FUNCTION materialize_auto_meals(date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION materialize_auto_meals(date, text) TO service_role;

-- ============================================
-- Function: materialize_auto_meals_for_today(p_period)
-- ============================================

CREATE OR REPLACE FUNCTION materialize_auto_meals_for_today(p_period meal_period)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  today date;
  result_count integer;
BEGIN
  today := (NOW() AT TIME ZONE 'Asia/Dhaka')::date;

  SELECT COUNT(*) INTO result_count
  FROM materialize_auto_meals(today, p_period);

  RAISE NOTICE 'Materialized % auto meals for % period on %', result_count, p_period, today;
END;
$$;

GRANT EXECUTE ON FUNCTION materialize_auto_meals_for_today(meal_period) TO service_role;

-- Backward-compatible wrapper (text signature from migration 020)
CREATE OR REPLACE FUNCTION materialize_auto_meals_for_today(p_period text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM materialize_auto_meals_for_today(p_period::meal_period);
END;
$$;

GRANT EXECUTE ON FUNCTION materialize_auto_meals_for_today(text) TO service_role;

-- ============================================
-- Function: backfill_auto_meals(p_start_date, p_end_date)
-- ============================================

CREATE OR REPLACE FUNCTION backfill_auto_meals(
  p_start_date date,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  meal_date date,
  period text,
  members_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_date_val date;
  today date;
  current_hour integer;
BEGIN
  today := (NOW() AT TIME ZONE 'Asia/Dhaka')::date;
  current_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Dhaka'));

  IF p_end_date IS NULL THEN
    p_end_date := today;
  END IF;

  FOR current_date_val IN
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
  LOOP
    IF current_date_val < today THEN
      RETURN QUERY
      SELECT current_date_val, 'morning'::text, COUNT(*)::bigint
      FROM materialize_auto_meals(current_date_val, 'morning'::meal_period);

      RETURN QUERY
      SELECT current_date_val, 'night'::text, COUNT(*)::bigint
      FROM materialize_auto_meals(current_date_val, 'night'::meal_period);

    ELSIF current_date_val = today THEN
      IF current_hour >= 7 THEN
        RETURN QUERY
        SELECT current_date_val, 'morning'::text, COUNT(*)::bigint
        FROM materialize_auto_meals(current_date_val, 'morning'::meal_period);
      END IF;

      IF current_hour >= 18 THEN
        RETURN QUERY
        SELECT current_date_val, 'night'::text, COUNT(*)::bigint
        FROM materialize_auto_meals(current_date_val, 'night'::meal_period);
      END IF;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION backfill_auto_meals(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_auto_meals(date, date) TO service_role;

-- ============================================
-- pg_cron: reschedule jobs to call corrected signature
-- NOTE: Keep your chosen schedule; this only updates the command + signature.
-- ============================================

DO $$
DECLARE
  v_job_id integer;
BEGIN
  -- Morning job: keep schedule from existing job if present; otherwise default to 0 1 * * *
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'materialize-morning-auto-meals' LIMIT 1;
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'materialize-morning-auto-meals',
    '0 1 * * *',
    'SELECT materialize_auto_meals_for_today(''morning''::meal_period)'
  );
EXCEPTION
  WHEN undefined_table THEN
    -- pg_cron not enabled
    NULL;
END $$;

DO $$
DECLARE
  v_job_id integer;
BEGIN
  -- Night job: keep schedule from existing job if present; otherwise default to 0 9 * * *
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'materialize-night-auto-meals' LIMIT 1;
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'materialize-night-auto-meals',
    '0 9 * * *',
    'SELECT materialize_auto_meals_for_today(''night''::meal_period)'
  );
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;
