-- Migration 032: Add missing call mode fields to sellers table
-- These fields are needed for the call mode page to display all information from the spreadsheet

-- Add inquiry fields
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_source TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_medium TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_content TEXT;

-- Add seller preference fields
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS sale_reason TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS desired_timing TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS desired_price TEXT;

-- Add notes field
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN sellers.inquiry_source IS '問い合わせ経路 (査定方法)';
COMMENT ON COLUMN sellers.inquiry_medium IS '問い合わせ媒体 (連絡方法)';
COMMENT ON COLUMN sellers.inquiry_content IS '問い合わせ内容 (査定理由)';
COMMENT ON COLUMN sellers.sale_reason IS '売却理由';
COMMENT ON COLUMN sellers.desired_timing IS '希望時期 (いつまでに売りたいか)';
COMMENT ON COLUMN sellers.desired_price IS '売却希望価格 (希望の価格はあるか)';
COMMENT ON COLUMN sellers.notes IS '備考 (訪問時注意点)';
