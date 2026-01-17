-- PostgRESTのスキーマキャッシュをリロードする
-- Migration 069の関数を認識させるために実行

-- 1. スキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';

-- 2. 関数が存在することを確認
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    n.nspname as schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_sync_monitoring_tables'
AND n.nspname = 'public';
