-- Migration: Add viewing_notes and latest_status to sellers table
-- Description: Adds viewing_notes and latest_status fields to sellers table for UI improvements

-- Add viewing_notes column (内覧前伝達事項)
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS viewing_notes TEXT;

-- Add latest_status column (最新状況)
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS latest_status TEXT;

-- Add comments for documentation
COMMENT ON COLUMN sellers.viewing_notes IS '内覧前伝達事項 - 訪問査定時に営業担当者が注意すべき事項';
COMMENT ON COLUMN sellers.latest_status IS '最新状況 - 売主の現在のステータス（定義済み選択肢またはカスタム値）';

-- Add index for latest_status for filtering
CREATE INDEX IF NOT EXISTS idx_sellers_latest_status ON sellers(latest_status);
