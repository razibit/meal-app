-- Deposit accounting dates, cutoff removal, and OCR audit/storage support.

ALTER TABLE deposits ADD COLUMN accounting_date date;
UPDATE deposits SET accounting_date = (deposit_date AT TIME ZONE 'Asia/Dhaka')::date WHERE accounting_date IS NULL;
ALTER TABLE deposits ALTER COLUMN accounting_date SET NOT NULL;
CREATE INDEX idx_deposits_accounting_date ON deposits(accounting_date);

DROP POLICY IF EXISTS "Members can view all deposits" ON deposits;
DROP POLICY IF EXISTS "Members can insert deposits" ON deposits;
DROP POLICY IF EXISTS "Members can update their own added deposits" ON deposits;
DROP POLICY IF EXISTS "Members can delete their own added deposits" ON deposits;
CREATE POLICY "Admins can manage deposits" ON deposits FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION get_member_total_deposit(p_member_id uuid, p_start_date date, p_end_date date)
RETURNS numeric LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount), 0) FROM deposits
  WHERE depositor_id = p_member_id AND accounting_date BETWEEN p_start_date AND p_end_date;
$$;

CREATE OR REPLACE FUNCTION get_monthly_deposit_report_with_dates(p_start_date date, p_end_date date)
RETURNS TABLE (depositor_id uuid, depositor_name text, deposit_date timestamptz, added_by_name text, amount numeric, details text, total_amount numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT d.depositor_id, dm.name, d.deposit_date, am.name, d.amount, d.details,
    SUM(d.amount) OVER (PARTITION BY d.depositor_id)
  FROM deposits d JOIN members dm ON dm.id = d.depositor_id JOIN members am ON am.id = d.added_by
  WHERE d.accounting_date BETWEEN p_start_date AND p_end_date
  ORDER BY dm.name, d.accounting_date, d.created_at;
$$;

DROP FUNCTION IF EXISTS materialize_auto_meals(date, meal_period);
DROP FUNCTION IF EXISTS materialize_auto_meals(date, text);
DROP FUNCTION IF EXISTS materialize_auto_meals_for_today(meal_period);
DROP FUNCTION IF EXISTS materialize_auto_meals_for_today(text);
DROP FUNCTION IF EXISTS check_meal_exists(uuid, date, meal_period);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname ILIKE '%meal%' AND jobname ILIKE '%material%';
  END IF;
EXCEPTION WHEN undefined_table OR invalid_schema_name THEN NULL; END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('whiteboard-images', 'whiteboard-images', false, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admins can read whiteboard images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload whiteboard images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update whiteboard images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete whiteboard images" ON storage.objects;
CREATE POLICY "Admins can read whiteboard images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'whiteboard-images' AND public.is_admin());
CREATE POLICY "Admins can upload whiteboard images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whiteboard-images' AND public.is_admin());
CREATE POLICY "Admins can update whiteboard images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'whiteboard-images' AND public.is_admin()) WITH CHECK (bucket_id = 'whiteboard-images' AND public.is_admin());
CREATE POLICY "Admins can delete whiteboard images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'whiteboard-images' AND public.is_admin());

ALTER TABLE ocr_imports ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE ocr_imports ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'pending';
ALTER TABLE ocr_imports ADD COLUMN IF NOT EXISTS validation_report jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE ocr_imports ADD COLUMN IF NOT EXISTS breakfast_total integer NOT NULL DEFAULT 0;
ALTER TABLE ocr_imports ADD COLUMN IF NOT EXISTS lunch_total integer NOT NULL DEFAULT 0;
ALTER TABLE ocr_imports ADD COLUMN IF NOT EXISTS dinner_total integer NOT NULL DEFAULT 0;
ALTER TABLE ocr_imports ADD COLUMN IF NOT EXISTS model_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE ocr_imports ADD COLUMN IF NOT EXISTS processed_at timestamptz;
ALTER TABLE ocr_imports DROP CONSTRAINT IF EXISTS ocr_imports_status_check;
UPDATE ocr_imports SET status = CASE WHEN status = 'parsed' THEN 'ready' ELSE status END;
ALTER TABLE ocr_imports ADD CONSTRAINT ocr_imports_status_check CHECK (status IN ('processing','validation_failed','ready','applied','failed'));
ALTER TABLE ocr_imports ADD CONSTRAINT ocr_imports_validation_status_check CHECK (validation_status IN ('pending','valid','invalid','overridden'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_ocr_imports_storage_path ON ocr_imports(storage_path) WHERE storage_path IS NOT NULL;

CREATE OR REPLACE FUNCTION apply_ocr_meal_import(p_import_id uuid, p_meal_date date, p_rows jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row_item jsonb; v_member_id uuid; v_status text; v_validation text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins can apply OCR meal imports'; END IF;
  SELECT status, validation_status INTO v_status, v_validation FROM ocr_imports WHERE id = p_import_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OCR import not found'; END IF;
  IF v_status NOT IN ('ready','validation_failed','applied') THEN RAISE EXCEPTION 'OCR import is not reviewable'; END IF;
  IF v_status = 'validation_failed' THEN
    UPDATE ocr_imports SET validation_status = 'overridden' WHERE id = p_import_id;
  END IF;
  FOR row_item IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_member_id := NULLIF(row_item->>'member_id','')::uuid;
    IF v_member_id IS NULL THEN RAISE EXCEPTION 'Every applied row must have a matched member'; END IF;
    IF COALESCE((row_item->>'breakfast')::boolean, false) THEN
      INSERT INTO meals(member_id,meal_date,period,quantity) VALUES(v_member_id,p_meal_date,'breakfast',1)
      ON CONFLICT(member_id,meal_date,period) DO UPDATE SET quantity = GREATEST(meals.quantity,1);
    END IF;
    IF COALESCE((row_item->>'lunch')::boolean, false) THEN
      INSERT INTO meals(member_id,meal_date,period,quantity) VALUES(v_member_id,p_meal_date,'lunch',1)
      ON CONFLICT(member_id,meal_date,period) DO UPDATE SET quantity = GREATEST(meals.quantity,1);
    END IF;
    IF COALESCE((row_item->>'dinner')::boolean, false) THEN
      INSERT INTO meals(member_id,meal_date,period,quantity) VALUES(v_member_id,p_meal_date,'dinner',1)
      ON CONFLICT(member_id,meal_date,period) DO UPDATE SET quantity = GREATEST(meals.quantity,1);
    END IF;
  END LOOP;
  UPDATE ocr_imports SET status='applied', applied_at=now() WHERE id=p_import_id;
END $$;
REVOKE ALL ON FUNCTION apply_ocr_meal_import(uuid,date,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION apply_ocr_meal_import(uuid,date,jsonb) TO authenticated;
