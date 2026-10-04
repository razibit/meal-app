-- Create deposits table
CREATE TABLE deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depositor_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  details text,
  deposit_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_deposits_depositor_id ON deposits(depositor_id);
CREATE INDEX idx_deposits_added_by ON deposits(added_by);
CREATE INDEX idx_deposits_date ON deposits(deposit_date);

-- Enable RLS
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Members can view all deposits
CREATE POLICY "Members can view all deposits"
  ON deposits FOR SELECT
  TO authenticated
  USING (true);

-- Members can insert deposits for any member
CREATE POLICY "Members can insert deposits"
  ON deposits FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Members can update their own added deposits
CREATE POLICY "Members can update their own added deposits"
  ON deposits FOR UPDATE
  TO authenticated
  USING (added_by = auth.uid());

-- Members can delete their own added deposits
CREATE POLICY "Members can delete their own added deposits"
  ON deposits FOR DELETE
  TO authenticated
  USING (added_by = auth.uid());

-- Function to get monthly deposit report with custom dates
CREATE OR REPLACE FUNCTION get_monthly_deposit_report_with_dates(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  depositor_id uuid,
  depositor_name text,
  deposit_date timestamptz,
  added_by_name text,
  amount numeric,
  details text,
  total_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH deposit_details AS (
    SELECT 
      d.depositor_id,
      m1.name as depositor_name,
      d.deposit_date,
      m2.name as added_by_name,
      d.amount,
      d.details
    FROM deposits d
    JOIN members m1 ON d.depositor_id = m1.id
    JOIN members m2 ON d.added_by = m2.id
    WHERE d.deposit_date::date >= p_start_date
      AND d.deposit_date::date <= p_end_date
    ORDER BY m1.name, d.deposit_date
  ),
  totals AS (
    SELECT 
      dd.depositor_id,
      SUM(dd.amount) as total_amount
    FROM deposit_details dd
    GROUP BY dd.depositor_id
  )
  SELECT 
    dd.depositor_id,
    dd.depositor_name,
    dd.deposit_date,
    dd.added_by_name,
    dd.amount,
    dd.details,
    t.total_amount
  FROM deposit_details dd
  JOIN totals t ON dd.depositor_id = t.depositor_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get member total deposit for current month
CREATE OR REPLACE FUNCTION get_member_total_deposit(
  p_member_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM deposits
  WHERE depositor_id = p_member_id
    AND deposit_date::date >= p_start_date
    AND deposit_date::date <= p_end_date;
$$ LANGUAGE sql STABLE;
