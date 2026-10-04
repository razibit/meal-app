-- Create grocery_expenses table
CREATE TABLE grocery_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('cash', 'credit')),
  details text,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  expense_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_grocery_expenses_shopper_id ON grocery_expenses(shopper_id);
CREATE INDEX idx_grocery_expenses_added_by ON grocery_expenses(added_by);
CREATE INDEX idx_grocery_expenses_date ON grocery_expenses(expense_date);
CREATE INDEX idx_grocery_expenses_type ON grocery_expenses(transaction_type);

-- Enable RLS
ALTER TABLE grocery_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Members can view all grocery expenses
CREATE POLICY "Members can view all grocery expenses"
  ON grocery_expenses FOR SELECT
  TO authenticated
  USING (true);

-- Members can insert grocery expenses
CREATE POLICY "Members can insert grocery expenses"
  ON grocery_expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Members can update their own added expenses
CREATE POLICY "Members can update their own added expenses"
  ON grocery_expenses FOR UPDATE
  TO authenticated
  USING (added_by = auth.uid());

-- Members can delete their own added expenses
CREATE POLICY "Members can delete their own added expenses"
  ON grocery_expenses FOR DELETE
  TO authenticated
  USING (added_by = auth.uid());

-- Function to get grocery expense report with custom dates
CREATE OR REPLACE FUNCTION get_grocery_expense_report_with_dates(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  expense_id uuid,
  expense_date timestamptz,
  added_by_id uuid,
  added_by_name text,
  shopper_id uuid,
  shopper_name text,
  transaction_type text,
  details text,
  amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ge.id as expense_id,
    ge.expense_date,
    ge.added_by as added_by_id,
    m_added.name as added_by_name,
    ge.shopper_id,
    m_shopper.name as shopper_name,
    ge.transaction_type,
    ge.details,
    ge.amount
  FROM grocery_expenses ge
  JOIN members m_added ON ge.added_by = m_added.id
  JOIN members m_shopper ON ge.shopper_id = m_shopper.id
  WHERE ge.expense_date::date >= p_start_date
    AND ge.expense_date::date <= p_end_date
  ORDER BY ge.expense_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get total cash grocery expenses for balance calculation
CREATE OR REPLACE FUNCTION get_total_cash_grocery_expenses(
  p_start_date date,
  p_end_date date
)
RETURNS numeric AS $$
DECLARE
  total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total
  FROM grocery_expenses
  WHERE transaction_type = 'cash'
    AND expense_date::date >= p_start_date
    AND expense_date::date <= p_end_date;
  RETURN total;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get total deposits for balance calculation
CREATE OR REPLACE FUNCTION get_total_deposits(
  p_start_date date,
  p_end_date date
)
RETURNS numeric AS $$
DECLARE
  total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total
  FROM deposits
  WHERE deposit_date::date >= p_start_date
    AND deposit_date::date <= p_end_date;
  RETURN total;
END;
$$ LANGUAGE plpgsql STABLE;
