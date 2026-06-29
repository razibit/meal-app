-- Admin-driven accountless members, three daily meals, and OCR import support.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_period_v2') THEN
    CREATE TYPE meal_period_v2 AS ENUM ('breakfast', 'lunch', 'dinner');
  END IF;
END $$;

ALTER TABLE meals
  ALTER COLUMN period TYPE meal_period_v2
  USING (
    CASE period::text
      WHEN 'morning' THEN 'breakfast'
      WHEN 'night' THEN 'dinner'
      ELSE period::text
    END
  )::meal_period_v2;

DROP FUNCTION IF EXISTS get_today_meal_counts(date, meal_period);
DROP FUNCTION IF EXISTS check_meal_exists(uuid, date, meal_period);
DROP FUNCTION IF EXISTS materialize_auto_meals(date, meal_period);
DROP FUNCTION IF EXISTS materialize_auto_meals_for_today(meal_period);

DROP TYPE IF EXISTS meal_period CASCADE;
ALTER TYPE meal_period_v2 RENAME TO meal_period;

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_id_fkey;
ALTER TABLE members ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE members ALTER COLUMN email DROP NOT NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE meal_details ADD COLUMN IF NOT EXISTS breakfast_details text;
ALTER TABLE meal_details ADD COLUMN IF NOT EXISTS lunch_details text;
ALTER TABLE meal_details ADD COLUMN IF NOT EXISTS dinner_details text;

UPDATE meal_details
SET
  breakfast_details = COALESCE(breakfast_details, morning_details),
  dinner_details = COALESCE(dinner_details, night_details);

ALTER TABLE meal_details DROP COLUMN IF EXISTS morning_details;
ALTER TABLE meal_details DROP COLUMN IF EXISTS night_details;

ALTER TABLE members DROP COLUMN IF EXISTS auto_meal_morning;
ALTER TABLE members DROP COLUMN IF EXISTS auto_meal_night;
ALTER TABLE members DROP COLUMN IF EXISTS auto_meal_morning_quantity;
ALTER TABLE members DROP COLUMN IF EXISTS auto_meal_night_quantity;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members
    WHERE id = auth.uid()
      AND role = 'admin'
      AND active = true
  );
$$;

-- Drop functions with old signature before recreating with new return type
DROP FUNCTION IF EXISTS get_member_monthly_report_with_dates(uuid, date, date);
DROP FUNCTION IF EXISTS get_global_monthly_report_with_dates(date, date);
DROP FUNCTION IF EXISTS get_monthly_summary(text);

DROP POLICY IF EXISTS "Members can view all profiles" ON members;
DROP POLICY IF EXISTS "Members can update own profile" ON members;
DROP POLICY IF EXISTS "Members can insert own profile" ON members;
DROP POLICY IF EXISTS "Members can view all meals" ON meals;
DROP POLICY IF EXISTS "Members can add own meals" ON meals;
DROP POLICY IF EXISTS "Members can remove own meals" ON meals;
DROP POLICY IF EXISTS "Members can update own meals" ON meals;
DROP POLICY IF EXISTS "Members can view meal details" ON meal_details;
DROP POLICY IF EXISTS "Members can insert meal details" ON meal_details;
DROP POLICY IF EXISTS "Members can update meal details" ON meal_details;
DROP POLICY IF EXISTS "Members can delete meal details" ON meal_details;

CREATE POLICY "Admins can manage members"
  ON members FOR ALL
  TO authenticated
  USING (public.is_admin() OR auth.uid() = id)
  WITH CHECK (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Admins can manage meals"
  ON meals FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage meal details"
  ON meal_details FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS ocr_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_date date NOT NULL,
  file_name text,
  mime_type text,
  status text NOT NULL DEFAULT 'parsed' CHECK (status IN ('parsed', 'applied', 'failed')),
  raw_output jsonb,
  created_by uuid REFERENCES members(id),
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ocr_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES ocr_imports(id) ON DELETE CASCADE,
  detected_name text NOT NULL,
  matched_member_id uuid REFERENCES members(id),
  breakfast boolean NOT NULL DEFAULT false,
  lunch boolean NOT NULL DEFAULT false,
  dinner boolean NOT NULL DEFAULT false,
  confidence numeric(5, 4),
  needs_review boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ocr_imports_meal_date ON ocr_imports(meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_import_rows_import ON ocr_import_rows(import_id);

ALTER TABLE ocr_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage OCR imports" ON ocr_imports;
DROP POLICY IF EXISTS "Admins can manage OCR import rows" ON ocr_import_rows;

CREATE POLICY "Admins can manage OCR imports"
  ON ocr_imports FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage OCR import rows"
  ON ocr_import_rows FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER update_ocr_imports_updated_at
  BEFORE UPDATE ON ocr_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION get_member_monthly_report_with_dates(
  p_member_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  meal_date date,
  breakfast_count integer,
  lunch_count integer,
  dinner_count integer,
  egg_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, interval '1 day')::date AS d
  )
  SELECT
    ds.d AS meal_date,
    COALESCE((SELECT SUM(quantity)::integer FROM meals WHERE member_id = p_member_id AND meals.meal_date = ds.d AND period = 'breakfast'), 0) AS breakfast_count,
    COALESCE((SELECT SUM(quantity)::integer FROM meals WHERE member_id = p_member_id AND meals.meal_date = ds.d AND period = 'lunch'), 0) AS lunch_count,
    COALESCE((SELECT SUM(quantity)::integer FROM meals WHERE member_id = p_member_id AND meals.meal_date = ds.d AND period = 'dinner'), 0) AS dinner_count,
    COALESCE((SELECT quantity FROM eggs WHERE member_id = p_member_id AND egg_date = ds.d), 0) AS egg_count
  FROM date_series ds
  ORDER BY ds.d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_global_monthly_report_with_dates(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  meal_date date,
  member_id uuid,
  member_name text,
  breakfast_count integer,
  lunch_count integer,
  dinner_count integer,
  egg_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, interval '1 day')::date AS d
  )
  SELECT
    ds.d AS meal_date,
    m.id AS member_id,
    m.name AS member_name,
    COALESCE((SELECT SUM(quantity)::integer FROM meals WHERE meals.member_id = m.id AND meals.meal_date = ds.d AND period = 'breakfast'), 0) AS breakfast_count,
    COALESCE((SELECT SUM(quantity)::integer FROM meals WHERE meals.member_id = m.id AND meals.meal_date = ds.d AND period = 'lunch'), 0) AS lunch_count,
    COALESCE((SELECT SUM(quantity)::integer FROM meals WHERE meals.member_id = m.id AND meals.meal_date = ds.d AND period = 'dinner'), 0) AS dinner_count,
    COALESCE((SELECT quantity FROM eggs WHERE eggs.member_id = m.id AND eggs.egg_date = ds.d), 0) AS egg_count
  FROM date_series ds
  CROSS JOIN members m
  WHERE m.active = true
  ORDER BY ds.d, m.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_monthly_summary(target_month text)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  breakfast_quantity bigint,
  lunch_quantity bigint,
  dinner_quantity bigint,
  egg_quantity bigint,
  monthly_total bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS member_id,
    m.name AS member_name,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'breakfast'), 0) AS breakfast_quantity,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'lunch'), 0) AS lunch_quantity,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'dinner'), 0) AS dinner_quantity,
    COALESCE(SUM(e.quantity), 0) AS egg_quantity,
    COALESCE(SUM(me.quantity), 0) AS monthly_total
  FROM members m
  LEFT JOIN meals me ON me.member_id = m.id
    AND date_trunc('month', me.meal_date) = date_trunc('month', target_month::date)
  LEFT JOIN eggs e ON e.member_id = m.id
    AND date_trunc('month', e.egg_date) = date_trunc('month', target_month::date)
  GROUP BY m.id, m.name
  ORDER BY m.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION apply_ocr_meal_import(
  p_import_id uuid,
  p_meal_date date,
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_item jsonb;
  v_member_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can apply OCR meal imports';
  END IF;

  FOR row_item IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_member_id := (row_item->>'member_id')::uuid;

    IF COALESCE((row_item->>'breakfast')::boolean, false) THEN
      INSERT INTO meals (member_id, meal_date, period, quantity)
      VALUES (v_member_id, p_meal_date, 'breakfast', 1)
      ON CONFLICT (member_id, meal_date, period)
      DO UPDATE SET quantity = EXCLUDED.quantity;
    END IF;

    IF COALESCE((row_item->>'lunch')::boolean, false) THEN
      INSERT INTO meals (member_id, meal_date, period, quantity)
      VALUES (v_member_id, p_meal_date, 'lunch', 1)
      ON CONFLICT (member_id, meal_date, period)
      DO UPDATE SET quantity = EXCLUDED.quantity;
    END IF;

    IF COALESCE((row_item->>'dinner')::boolean, false) THEN
      INSERT INTO meals (member_id, meal_date, period, quantity)
      VALUES (v_member_id, p_meal_date, 'dinner', 1)
      ON CONFLICT (member_id, meal_date, period)
      DO UPDATE SET quantity = EXCLUDED.quantity;
    END IF;
  END LOOP;

  UPDATE ocr_imports
  SET status = 'applied',
      applied_at = now()
  WHERE id = p_import_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_monthly_report_with_dates(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_monthly_report_with_dates(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_summary(text) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_ocr_meal_import(uuid, date, jsonb) TO authenticated;
