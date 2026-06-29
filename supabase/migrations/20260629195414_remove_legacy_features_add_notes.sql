-- Remove obsolete chat, egg, and rice-variant features and add shared admin notes.

DROP FUNCTION IF EXISTS get_member_monthly_report_with_dates(uuid, date, date);
DROP FUNCTION IF EXISTS get_global_monthly_report_with_dates(date, date);
DROP FUNCTION IF EXISTS get_monthly_summary(text);

CREATE FUNCTION get_member_monthly_report_with_dates(p_member_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE (meal_date date, breakfast_count integer, lunch_count integer, dinner_count integer)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT d::date,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'breakfast'), 0)::integer,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'lunch'), 0)::integer,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'dinner'), 0)::integer
  FROM generate_series(p_start_date, p_end_date, interval '1 day') d
  LEFT JOIN meals me ON me.member_id = p_member_id AND me.meal_date = d::date
  GROUP BY d ORDER BY d;
$$;

CREATE FUNCTION get_global_monthly_report_with_dates(p_start_date date, p_end_date date)
RETURNS TABLE (meal_date date, member_id uuid, member_name text, breakfast_count integer, lunch_count integer, dinner_count integer)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT d::date, m.id, m.name,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'breakfast'), 0)::integer,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'lunch'), 0)::integer,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'dinner'), 0)::integer
  FROM generate_series(p_start_date, p_end_date, interval '1 day') d
  CROSS JOIN members m
  LEFT JOIN meals me ON me.member_id = m.id AND me.meal_date = d::date
  WHERE m.active = true
  GROUP BY d, m.id, m.name ORDER BY d, m.name;
$$;

CREATE FUNCTION get_monthly_summary(target_month text)
RETURNS TABLE (member_id uuid, member_name text, breakfast_quantity bigint, lunch_quantity bigint, dinner_quantity bigint, monthly_total bigint)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT m.id, m.name,
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'breakfast'), 0),
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'lunch'), 0),
    COALESCE(SUM(me.quantity) FILTER (WHERE me.period = 'dinner'), 0),
    COALESCE(SUM(me.quantity), 0)
  FROM members m
  LEFT JOIN meals me ON me.member_id = m.id
    AND date_trunc('month', me.meal_date) = date_trunc('month', target_month::date)
  GROUP BY m.id, m.name ORDER BY m.name;
$$;

DROP FUNCTION IF EXISTS get_latest_meal_rate(date, date);
DROP FUNCTION IF EXISTS get_meal_rate_history(date, date, integer);
DROP TRIGGER IF EXISTS meal_rate_track_eggs ON eggs;
DROP TRIGGER IF EXISTS meal_rate_track_egg_price ON egg_price_config;
DROP FUNCTION IF EXISTS trg_meal_rate_after_eggs();
DROP FUNCTION IF EXISTS trg_meal_rate_after_egg_price();

ALTER TABLE meal_rate_history
  DROP COLUMN IF EXISTS total_egg_cost,
  DROP COLUMN IF EXISTS total_eggs,
  DROP COLUMN IF EXISTS egg_price;

ALTER TABLE meal_rate_history DROP CONSTRAINT IF EXISTS meal_rate_history_trigger_source_check;
ALTER TABLE meal_rate_history ADD CONSTRAINT meal_rate_history_trigger_source_check
  CHECK (trigger_source IN ('meals', 'grocery_expenses', 'manual'));

CREATE OR REPLACE FUNCTION calculate_and_store_meal_rate(p_trigger_source text DEFAULT 'manual')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date; v_end date; v_total_exp numeric; v_total_meals integer;
  v_rate numeric; v_last_rate numeric;
BEGIN
  IF NOT public.is_admin() AND p_trigger_source = 'manual' THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT p_start, p_end INTO v_start, v_end FROM get_current_meal_month();
  SELECT COALESCE(SUM(amount), 0) INTO v_total_exp FROM grocery_expenses WHERE expense_date BETWEEN v_start AND v_end;
  SELECT COALESCE(SUM(quantity), 0)::integer INTO v_total_meals FROM meals WHERE meal_date BETWEEN v_start AND v_end;
  v_rate := CASE WHEN v_total_meals = 0 THEN 0 ELSE GREATEST(0, v_total_exp / v_total_meals) END;
  SELECT meal_rate INTO v_last_rate FROM meal_rate_history WHERE period_start = v_start AND period_end = v_end ORDER BY created_at DESC LIMIT 1;
  IF v_last_rate IS NOT NULL AND abs(v_last_rate - v_rate) < 0.01 THEN RETURN; END IF;
  INSERT INTO meal_rate_history (meal_rate, total_expenses, total_meals, trigger_source, period_start, period_end)
  VALUES (round(v_rate, 4), v_total_exp, v_total_meals, p_trigger_source, v_start, v_end);
END; $$;

CREATE FUNCTION get_latest_meal_rate(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE (meal_rate numeric, total_expenses numeric, total_meals integer, trigger_source text, period_start date, period_end date, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT h.meal_rate, h.total_expenses, h.total_meals, h.trigger_source, h.period_start, h.period_end, h.created_at
  FROM meal_rate_history h
  WHERE h.period_start = COALESCE(p_start_date, (SELECT p_start FROM get_current_meal_month()))
    AND h.period_end = COALESCE(p_end_date, (SELECT p_end FROM get_current_meal_month()))
  ORDER BY h.created_at DESC LIMIT 1;
$$;

CREATE FUNCTION get_meal_rate_history(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL, p_limit integer DEFAULT 50)
RETURNS TABLE (id uuid, meal_rate numeric, total_expenses numeric, total_meals integer, trigger_source text, period_start date, period_end date, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT h.id, h.meal_rate, h.total_expenses, h.total_meals, h.trigger_source, h.period_start, h.period_end, h.created_at
  FROM meal_rate_history h
  WHERE h.period_start = COALESCE(p_start_date, (SELECT p_start FROM get_current_meal_month()))
    AND h.period_end = COALESCE(p_end_date, (SELECT p_end FROM get_current_meal_month()))
  ORDER BY h.created_at DESC LIMIT p_limit;
$$;

DROP FUNCTION IF EXISTS get_available_eggs(date);
DROP FUNCTION IF EXISTS get_total_eggs_added(date);
DROP FUNCTION IF EXISTS validate_egg_consumption();
DROP FUNCTION IF EXISTS check_available_eggs_constraint();
DROP FUNCTION IF EXISTS get_member_monthly_report(uuid, text);
DROP FUNCTION IF EXISTS get_member_monthly_summary(uuid, text);
DROP FUNCTION IF EXISTS get_monthly_report(text);
DROP TABLE IF EXISTS eggs CASCADE;
DROP TABLE IF EXISTS egg_inventory CASCADE;
DROP TABLE IF EXISTS egg_price_config CASCADE;

DROP FUNCTION IF EXISTS notify_mentioned_users();
DROP FUNCTION IF EXISTS delete_old_chat_messages();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'delete-old-chats';
  END IF;
EXCEPTION WHEN undefined_table OR invalid_schema_name THEN NULL; END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chats') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE chats;
  END IF;
END $$;
DROP TABLE IF EXISTS chats CASCADE;

ALTER TABLE members DROP COLUMN IF EXISTS rice_preference;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.members (id, email, name, phone, role, active)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'phone', 'member', true)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END; $$;

CREATE TABLE admin_notes (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  content text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage shared notes" ON admin_notes FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER update_admin_notes_updated_at BEFORE UPDATE ON admin_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
INSERT INTO admin_notes (id) VALUES (true) ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON admin_notes TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_monthly_report_with_dates(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_monthly_report_with_dates(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_summary(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_meal_rate(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_meal_rate_history(date, date, integer) TO authenticated;
REVOKE ALL ON FUNCTION apply_ocr_meal_import(uuid, date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION apply_ocr_meal_import(uuid, date, jsonb) TO authenticated;
