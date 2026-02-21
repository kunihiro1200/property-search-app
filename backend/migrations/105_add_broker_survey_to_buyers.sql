-- Migration: Add broker_survey column to buyers table
-- Description: 業者向けアンケートフィールドを追加
-- Date: 2026-02-10

-- Add broker_survey column
ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS broker_survey TEXT;

-- Add comment
COMMENT ON COLUMN buyers.broker_survey IS '業者向けアンケート';
