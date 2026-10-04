-- Remove deprecated notice/community notes field from meal_details
-- This keeps older migrations intact while ensuring the live schema no longer includes the column.

ALTER TABLE meal_details
	DROP COLUMN IF EXISTS notice;
