-- Migration: Add exclusion_action column to sellers table
-- Description: Adds a new column to store the exclusion action selected by users

ALTER TABLE sellers 
ADD COLUMN exclusion_action VARCHAR(255);

-- Add comment to document the column
COMMENT ON COLUMN sellers.exclusion_action IS '除外アクション（除外日に不通であれば除外、除外日に何もせず除外）';
