-- Migration 029: Remove status and confidence constraints to allow Japanese values from spreadsheet
-- スプレッドシートの日本語の値を許可するため、制約を削除

-- Drop status constraint
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_status_check;

-- Drop confidence constraint  
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_confidence_level_check;

-- Add comments
COMMENT ON COLUMN sellers.status IS '状況（当社）- スプレッドシートの値をそのまま保存（日本語可）';
COMMENT ON COLUMN sellers.confidence IS '確度 - スプレッドシートの値をそのまま保存（A, B, C, D, E等）';
