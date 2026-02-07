-- Migration: Alter activity_logs.target_id from UUID to VARCHAR
-- Reason: target_id needs to store buyer_number (string like "4216") instead of UUID

-- Step 1: Drop existing data (if any) to avoid type conversion issues
TRUNCATE TABLE activity_logs;

-- Step 2: Alter column type from UUID to VARCHAR
ALTER TABLE activity_logs 
ALTER COLUMN target_id TYPE VARCHAR(255);

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_target 
ON activity_logs(target_type, target_id);

-- Step 4: Add index for created_at
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at 
ON activity_logs(created_at DESC);
