-- Add valuation_text column to sellers table
-- This column stores the text-based valuation from column I (査定額) in the spreadsheet
-- Example values: "1900～2200万円", "2000万円前後"

ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS valuation_text TEXT;

-- Add comment for documentation
COMMENT ON COLUMN sellers.valuation_text IS 'Text-based valuation from spreadsheet column I (査定額). Used when numeric valuation amounts are not available.';
