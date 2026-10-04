-- Create egg_inventory table to track total eggs available in kitchen
-- Manager adds eggs to inventory when purchased

CREATE TABLE egg_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_eggs integer NOT NULL DEFAULT 0 CHECK (total_eggs >= 0),
  added_by uuid NOT NULL REFERENCES members(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only keep the latest inventory record (single row)
-- When manager updates, we replace the current value

-- Create index
CREATE INDEX idx_egg_inventory_created ON egg_inventory(created_at DESC);

-- Add trigger for updated_at column
CREATE TRIGGER update_egg_inventory_updated_at
  BEFORE UPDATE ON egg_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
ALTER TABLE egg_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for egg_inventory
CREATE POLICY "Everyone can view egg inventory"
  ON egg_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert egg inventory"
  ON egg_inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update egg inventory"
  ON egg_inventory FOR UPDATE
  TO authenticated
  USING (true);

-- Initialize with 0 eggs (will be updated by manager)
INSERT INTO egg_inventory (total_eggs, added_by, notes)
SELECT 
  0,
  id,
  'Initial setup'
FROM members
LIMIT 1;

-- ============================================
-- Function: get_available_eggs
-- Purpose: Calculate available eggs (total - consumed today)
-- ============================================

CREATE OR REPLACE FUNCTION get_available_eggs(target_date date DEFAULT CURRENT_DATE)
RETURNS integer AS $$
DECLARE
  total_in_inventory integer;
  consumed_today integer;
BEGIN
  -- Get latest total eggs in inventory
  SELECT COALESCE(total_eggs, 0)
  INTO total_in_inventory
  FROM egg_inventory
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get total eggs consumed today
  SELECT COALESCE(SUM(quantity), 0)
  INTO consumed_today
  FROM eggs
  WHERE egg_date = target_date;
  
  -- Return available eggs
  RETURN GREATEST(total_in_inventory - consumed_today, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_available_eggs(date) TO authenticated;
