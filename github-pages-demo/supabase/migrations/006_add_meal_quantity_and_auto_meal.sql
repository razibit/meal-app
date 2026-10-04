-- Add quantity column to meals table (default 1, 0 means no meal)
ALTER TABLE meals ADD COLUMN quantity integer DEFAULT 1 CHECK (quantity >= 0 AND quantity <= 10);

-- Add auto_meal columns to members table
ALTER TABLE members ADD COLUMN auto_meal_morning boolean DEFAULT true;
ALTER TABLE members ADD COLUMN auto_meal_night boolean DEFAULT true;

-- Create index for auto meal queries
CREATE INDEX idx_members_auto_meal ON members(auto_meal_morning, auto_meal_night);

-- Update existing meals to have quantity = 1
UPDATE meals SET quantity = 1 WHERE quantity IS NULL;

-- Make quantity NOT NULL after setting defaults
ALTER TABLE meals ALTER COLUMN quantity SET NOT NULL;
