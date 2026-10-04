-- ============================================
-- Migration: Create egg price configuration table
-- Purpose: Store the price per egg for meal rate calculation
-- ============================================

CREATE TABLE egg_price_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_egg numeric(10, 2) NOT NULL DEFAULT 0,
  updated_by uuid NOT NULL REFERENCES members(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fetching the latest price
CREATE INDEX idx_egg_price_config_created ON egg_price_config(created_at DESC);

-- Add trigger for updated_at column
CREATE TRIGGER update_egg_price_config_updated_at
  BEFORE UPDATE ON egg_price_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
ALTER TABLE egg_price_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view egg price config"
  ON egg_price_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert egg price config"
  ON egg_price_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update egg price config"
  ON egg_price_config FOR UPDATE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE egg_price_config IS 'Stores the price per egg. Latest row contains the current price. Used for meal rate calculation.';

-- ============================================
-- Function: Get total grocery expenses (cash + credit) for meal rate calculation
-- ============================================
CREATE OR REPLACE FUNCTION get_total_grocery_expenses(
  p_start_date date,
  p_end_date date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount)
     FROM grocery_expenses
     WHERE expense_date >= p_start_date
       AND expense_date <= p_end_date),
    0
  );
END;
$$;
