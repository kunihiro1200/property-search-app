-- Migration: Add confirmation_to_assignee to buyers table
-- Description: Adds confirmation_to_assignee field to buyers table for Google Chat integration
-- Date: 2026-02-06
-- Requirements: 6.1, 6.2

-- Add confirmation_to_assignee column (諡・ｽ薙∈縺ｮ遒ｺ隱堺ｺ矩・
-- Note: This column may already exist from migration 042, so we use IF NOT EXISTS
ALTER TABLE buyers 
ADD COLUMN IF NOT EXISTS confirmation_to_assignee TEXT;

-- Add comment for documentation
COMMENT ON COLUMN buyers.confirmation_to_assignee IS '諡・ｽ薙∈縺ｮ遒ｺ隱堺ｺ矩・- 迚ｩ莉ｶ諡・ｽ楢・∈騾∽ｿ｡縺吶ｋ雉ｪ蝠上ｄ莨晁ｨ';

-- Note: No index is needed for this column as it's primarily used for display and editing,
-- not for filtering or searching
