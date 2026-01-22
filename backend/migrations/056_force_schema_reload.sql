-- Force PostgREST Schema Cache Reload for Migration 056
-- Run this in Supabase SQL Editor after running 056_add_email_history.sql

-- Step 1: Verify the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'email_history'
  ) THEN
    RAISE NOTICE 'Table email_history exists ✓';
  ELSE
    RAISE EXCEPTION 'Table email_history does NOT exist! Run 056_add_email_history.sql first.';
  END IF;
END $$;

-- Step 2: Create helper function to check table existence
CREATE OR REPLACE FUNCTION check_table_exists(table_schema text, table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = $1 AND table_name = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create helper function to notify PostgREST
CREATE OR REPLACE FUNCTION notify_pgrst_reload()
RETURNS void AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
  RAISE NOTICE 'PostgREST schema reload notification sent ✓';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Send the reload notification
SELECT notify_pgrst_reload();

-- Step 5: Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'email_history'
ORDER BY ordinal_position;

-- Step 6: Verify indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'email_history';

-- Step 7: Test insert (will rollback)
DO $$
DECLARE
  test_id INTEGER;
BEGIN
  -- Try to insert a test record
  INSERT INTO email_history (
    buyer_id,
    property_numbers,
    recipient_email,
    subject,
    body,
    sender_email,
    email_type
  ) VALUES (
    'TEST_BUYER',
    ARRAY['TEST_PROP'],
    'test@example.com',
    'Test Subject',
    'Test Body',
    'sender@example.com',
    'test'
  ) RETURNING id INTO test_id;
  
  RAISE NOTICE 'Test insert successful (ID: %) ✓', test_id;
  
  -- Rollback the test insert
  RAISE EXCEPTION 'Rolling back test insert';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'Rolling back test insert' THEN
      RAISE NOTICE 'Test insert rolled back ✓';
    ELSE
      RAISE EXCEPTION 'Test insert failed: %', SQLERRM;
    END IF;
END $$;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Schema reload complete!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Wait 30-60 seconds for PostgREST to reload';
  RAISE NOTICE '2. Run: npx ts-node test-email-history-api.ts';
  RAISE NOTICE '========================================';
END $$;
