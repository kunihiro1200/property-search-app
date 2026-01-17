-- Make address column nullable in sellers table
-- This allows migration of records without address information

ALTER TABLE sellers 
ALTER COLUMN address DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN sellers.address IS '売主の住所（オプション）';
