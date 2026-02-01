-- Add auto_meal quantity columns to members table
-- These store the default meal quantity for auto meal feature

ALTER TABLE members ADD COLUMN auto_meal_morning_quantity integer DEFAULT 1 CHECK (auto_meal_morning_quantity >= 0 AND auto_meal_morning_quantity <= 10);
ALTER TABLE members ADD COLUMN auto_meal_night_quantity integer DEFAULT 1 CHECK (auto_meal_night_quantity >= 0 AND auto_meal_night_quantity <= 10);

-- Set default quantity to 1 for existing members
UPDATE members SET auto_meal_morning_quantity = 1 WHERE auto_meal_morning_quantity IS NULL;
UPDATE members SET auto_meal_night_quantity = 1 WHERE auto_meal_night_quantity IS NULL;

-- Make quantity NOT NULL after setting defaults
ALTER TABLE members ALTER COLUMN auto_meal_morning_quantity SET NOT NULL;
ALTER TABLE members ALTER COLUMN auto_meal_night_quantity SET NOT NULL;
