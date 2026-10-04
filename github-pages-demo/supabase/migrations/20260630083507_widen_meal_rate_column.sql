ALTER TABLE meal_rate_history
  ALTER COLUMN meal_rate TYPE numeric(14,8) USING meal_rate::numeric(14,8);
