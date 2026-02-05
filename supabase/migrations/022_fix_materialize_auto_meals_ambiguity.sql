-- ============================================
-- Migration: Fix materialize_auto_meals ambiguity
-- Purpose: Fix `member_id` ambiguity caused by PL/pgSQL RETURNS TABLE
--          output variables shadowing column names in ON CONFLICT clause.
--
-- Symptom:
--   ERROR: column reference "member_id" is ambiguous
--   DETAIL: It could refer to either a PL/pgSQL variable or a table column.
--
-- Root cause:
-- - In PL/pgSQL, RETURNS TABLE columns (member_id, member_name, quantity)
--   become variables in the function scope.
-- - The statement `ON CONFLICT (member_id, meal_date, period)` becomes
--   ambiguous because `member_id` can refer to either the variable or the
--   target table column.
--
-- Fix:
-- - Use `ON CONFLICT ON CONSTRAINT <constraint_name>` to unambiguously
--   target the meals unique constraint.
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

-- Keep permissions as previously granted
GRANT EXECUTE ON FUNCTION materialize_auto_meals(date, meal_period) TO authenticated;
GRANT EXECUTE ON FUNCTION materialize_auto_meals(date, meal_period) TO service_role;
