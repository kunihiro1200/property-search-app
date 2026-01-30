-- Add property_address column to sellers table
-- This column stores the property address (物件所在地) from spreadsheet column R

ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS property_address TEXT;

COMMENT ON COLUMN sellers.property_address IS '物件所在地（スプレッドシートR列）';
