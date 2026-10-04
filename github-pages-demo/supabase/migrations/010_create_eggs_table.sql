-- Create eggs table to track egg consumption per member per date
CREATE TABLE eggs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  egg_date date NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0 AND quantity <= 50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, egg_date)
);

-- Create indexes on eggs table
CREATE INDEX idx_eggs_date ON eggs(egg_date);
CREATE INDEX idx_eggs_member_date ON eggs(member_id, egg_date);

-- Add trigger for updated_at column
CREATE TRIGGER update_eggs_updated_at
  BEFORE UPDATE ON eggs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to authenticated users
ALTER TABLE eggs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for eggs table
CREATE POLICY "Users can view all eggs records"
  ON eggs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own eggs records"
  ON eggs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can update their own eggs records"
  ON eggs FOR UPDATE
  TO authenticated
  USING (auth.uid() = member_id);

CREATE POLICY "Users can delete their own eggs records"
  ON eggs FOR DELETE
  TO authenticated
  USING (auth.uid() = member_id);
