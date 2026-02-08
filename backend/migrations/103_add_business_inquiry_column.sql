-- Migration: Add business_inquiry column to buyers table
-- Date: 2026-02-08
-- Description: 法人名に入力がある場合に表示される「業者問合せ」フィールドを追加

-- Add business_inquiry column
ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS business_inquiry TEXT;

-- Add comment
COMMENT ON COLUMN buyers.business_inquiry IS '業者問合せ（選択肢: 業者問合せ、業者（両手））';
