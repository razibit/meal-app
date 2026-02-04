-- ============================================
-- Migration: Materialize Auto Meals
-- Purpose: Create function and scheduled jobs to convert auto meals 
--          into actual meal records when cutoff passes
-- ============================================

-- ============================================
-- Function: materialize_auto_meals
-- Purpose: Insert meal records for members with auto_meal enabled
--          who don't have explicit meal records for the given date/period
-- 
-- This function should be called when the cutoff time passes.
-- It will NOT overwrite existing explicit meal records.
-- ============================================

CREATE OR REPLACE FUNCTION materialize_auto_meals(
  p_date date,
  p_period text
)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  quantity integer
) AS $$
BEGIN
  -- Validate period
  IF p_period NOT IN ('morning', 'night') THEN
    RAISE EXCEPTION 'Invalid period: %. Must be "morning" or "night"', p_period;
  END IF;

  -- Insert auto meals for members who:
  -- 1. Have auto_meal enabled for this period
  -- 2. Don't already have an explicit meal record for this date/period
  -- 3. Have auto_meal_quantity > 0
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
      -- Auto meal is enabled for this period
      CASE 
        WHEN p_period = 'morning' THEN m.auto_meal_morning = true
        ELSE m.auto_meal_night = true
      END
      -- Auto meal quantity > 0
      AND CASE 
        WHEN p_period = 'morning' THEN m.auto_meal_morning_quantity > 0
        ELSE m.auto_meal_night_quantity > 0
      END
      -- No existing meal record for this date/period
      AND NOT EXISTS (
        SELECT 1 FROM meals me
        WHERE me.member_id = m.id
          AND me.meal_date = p_date
          AND me.period = p_period
      )
    ON CONFLICT (member_id, meal_date, period) DO NOTHING
    RETURNING meals.member_id, meals.quantity
  )
  SELECT 
    i.member_id,
    m.name as member_name,
    i.quantity
  FROM inserted i
  JOIN members m ON m.id = i.member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION materialize_auto_meals(date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION materialize_auto_meals(date, text) TO service_role;

-- ============================================
-- Function: materialize_auto_meals_for_today
-- Purpose: Wrapper function that materializes auto meals for today
--          Called by pg_cron at cutoff times
-- ============================================

CREATE OR REPLACE FUNCTION materialize_auto_meals_for_today(p_period text)
RETURNS void AS $$
DECLARE
  today date;
  result_count integer;
BEGIN
  -- Get current date in UTC+6
  today := (NOW() AT TIME ZONE 'Asia/Dhaka')::date;
  
  -- Materialize auto meals
  SELECT COUNT(*) INTO result_count
  FROM materialize_auto_meals(today, p_period);
  
  -- Log the result
  RAISE NOTICE 'Materialized % auto meals for % period on %', result_count, p_period, today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION materialize_auto_meals_for_today(text) TO service_role;

-- ============================================
-- Function: backfill_auto_meals
-- Purpose: Backfill auto meals for a date range (for catch-up scenarios)
--          Only processes dates in the past where cutoff has passed
-- ============================================

CREATE OR REPLACE FUNCTION backfill_auto_meals(
  p_start_date date,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  meal_date date,
  period text,
  members_count bigint
) AS $$
DECLARE
  current_date_val date;
  today date;
  current_hour integer;
BEGIN
  -- Get current date and hour in UTC+6
  today := (NOW() AT TIME ZONE 'Asia/Dhaka')::date;
  current_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Dhaka'));
  
  -- Default end_date to today if not provided
  IF p_end_date IS NULL THEN
    p_end_date := today;
  END IF;
  
  -- Process each date in the range
  FOR current_date_val IN SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
  LOOP
    -- For past dates, materialize both periods
    IF current_date_val < today THEN
      -- Morning period
      RETURN QUERY
      SELECT 
        current_date_val as meal_date,
        'morning'::text as period,
        COUNT(*)::bigint as members_count
      FROM materialize_auto_meals(current_date_val, 'morning');
      
      -- Night period
      RETURN QUERY
      SELECT 
        current_date_val as meal_date,
        'night'::text as period,
        COUNT(*)::bigint as members_count
      FROM materialize_auto_meals(current_date_val, 'night');
      
    -- For today, only materialize periods where cutoff has passed
    ELSIF current_date_val = today THEN
      -- Morning cutoff is 7 AM
      IF current_hour >= 7 THEN
        RETURN QUERY
        SELECT 
          current_date_val as meal_date,
          'morning'::text as period,
          COUNT(*)::bigint as members_count
        FROM materialize_auto_meals(current_date_val, 'morning');
      END IF;
      
      -- Night cutoff is 6 PM (18:00)
      IF current_hour >= 18 THEN
        RETURN QUERY
        SELECT 
          current_date_val as meal_date,
          'night'::text as period,
          COUNT(*)::bigint as members_count
        FROM materialize_auto_meals(current_date_val, 'night');
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION backfill_auto_meals(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_auto_meals(date, date) TO service_role;

-- ============================================
-- Setup pg_cron scheduled jobs
-- Note: pg_cron extension must be enabled in Supabase Dashboard
-- Dashboard -> Database -> Extensions -> Enable pg_cron
-- ============================================

-- Enable pg_cron extension (if not already enabled)
-- This may fail if pg_cron is not available - that's OK, can be enabled manually
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available. Please enable it manually in Supabase Dashboard.';
END $$;

-- Schedule morning auto meal materialization at 7:00 AM UTC+6 (1:00 AM UTC)
-- Cron expression: minute hour day month day-of-week
DO $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule('materialize-morning-auto-meals');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'materialize-morning-auto-meals',
    '0 1 * * *',  -- 1:00 AM UTC = 7:00 AM UTC+6
    $$SELECT materialize_auto_meals_for_today('morning')$$
  );
  RAISE NOTICE 'Scheduled morning auto meal materialization at 7:00 AM UTC+6';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule morning job. pg_cron may not be enabled.';
END $$;

-- Schedule night auto meal materialization at 3:00 PM UTC+6 (9:00 AM UTC)
DO $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule('materialize-night-auto-meals');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'materialize-night-auto-meals',
    '0 9 * * *',  -- 9:00 AM UTC = 3:00 PM UTC+6
    $$SELECT materialize_auto_meals_for_today('night')$$
  );
  RAISE NOTICE 'Scheduled night auto meal materialization at 3:00 PM UTC+6';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule night job. pg_cron may not be enabled.';
END $$;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON FUNCTION materialize_auto_meals(date, text) IS 
'Converts auto meal settings into actual meal records for a specific date/period.
Called automatically by pg_cron when cutoff passes.
Can also be called manually for backfilling.';

COMMENT ON FUNCTION materialize_auto_meals_for_today(text) IS 
'Wrapper for pg_cron to materialize auto meals for today.
Called at 7:00 AM UTC+6 for morning and 6:00 PM UTC+6 for night.';

COMMENT ON FUNCTION backfill_auto_meals(date, date) IS 
'Backfill auto meals for a date range. Use for catch-up scenarios.
Only processes dates where cutoff has already passed.
Example: SELECT * FROM backfill_auto_meals(''2026-01-01'', ''2026-02-04'');';
