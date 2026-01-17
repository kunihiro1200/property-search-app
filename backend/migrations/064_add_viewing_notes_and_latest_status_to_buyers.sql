-- Migration: Add viewing_notes and latest_status to buyers table
-- Description: Adds viewing_notes and latest_status fields to buyers table for UI improvements

-- Add viewing_notes column (内覧前伝達事項)
ALTER TABLE buyers 
ADD COLUMN IF NOT EXISTS viewing_notes TEXT;

-- Add latest_status column (最新状況)
ALTER TABLE buyers 
ADD COLUMN IF NOT EXISTS latest_status TEXT;

-- Add comments for documentation
COMMENT ON COLUMN buyers.viewing_notes IS '内覧前伝達事項 - 内覧前に伝えたい事項';
COMMENT ON COLUMN buyers.latest_status IS '最新状況 - 買主の現在のステータス（定義済み選択肢またはカスタム値）';

-- Add index for latest_status for filtering
CREATE INDEX IF NOT EXISTS idx_buyers_latest_status ON buyers(latest_status);
