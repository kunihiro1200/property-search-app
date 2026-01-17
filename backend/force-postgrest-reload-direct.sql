-- Force PostgREST to reload schema cache
-- Run this in Supabase SQL Editor after creating email_history table

-- Method 1: Send NOTIFY signal to PostgREST
NOTIFY pgrst, 'reload schema';

-- Method 2: Update pg_catalog to trigger cache invalidation
-- This forces PostgREST to detect schema changes
SELECT pg_notify('pgrst', 'reload schema');

-- Method 3: Verify the table exists and is accessible
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'email_history';

-- Method 4: Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'email_history';

-- Method 5: Grant explicit permissions to ensure PostgREST can access
GRANT ALL ON email_history TO postgres;
GRANT ALL ON email_history TO anon;
GRANT ALL ON email_history TO authenticated;
GRANT ALL ON email_history TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE email_history_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE email_history_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE email_history_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE email_history_id_seq TO service_role;
