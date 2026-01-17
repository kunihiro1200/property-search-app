-- Force PostgREST schema cache reload for sync tables
-- Run this in Supabase SQL Editor after running migrations

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify tables exist
SELECT 
  'sync_logs' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sync_logs'
  ) as exists;

SELECT 
  'sync_health' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sync_health'
  ) as exists;

-- Show table structures
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sync_logs'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sync_health'
ORDER BY ordinal_position;
