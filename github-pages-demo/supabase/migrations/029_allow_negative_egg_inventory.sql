-- ============================================
-- Migration: Allow negative total_eggs in egg_inventory for "Remove" entries
-- Purpose:
--   The manager sometimes gives eggs to the cook for a meal. These removals
--   are stored as negative egg_inventory rows so the SUM logic naturally
--   subtracts them from the available pool.
--
--   The original CHECK (total_eggs >= 0) must be dropped.
-- ============================================

-- Drop the CHECK constraint.
-- The constraint name is auto-generated; find and drop it.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
    FROM pg_constraint
   WHERE conrelid = 'egg_inventory'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%total_eggs%>=%0%'
   LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE egg_inventory DROP CONSTRAINT %I', constraint_name);
  END IF;
END;
$$;
