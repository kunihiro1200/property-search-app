-- PostgRESTを強制的に再起動させる最終手段
-- この方法でもダメな場合は、Supabaseプロジェクトの再起動が必要です

-- ステップ1: すべてのPostgreSQL接続を強制終了
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = current_database() 
  AND pid <> pg_backend_pid();

-- ステップ2: スキーマキャッシュを完全にクリア
DISCARD ALL;

-- ステップ3: PostgRESTに通知
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ステップ4: 少し待ってから再度通知
SELECT pg_sleep(2);
NOTIFY pgrst, 'reload schema';

-- ステップ5: カラムの存在と権限を確認
SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    t.table_name,
    t.table_schema,
    has_column_privilege('anon', 'public.property_listings', 'hidden_images', 'SELECT') as anon_select,
    has_column_privilege('anon', 'public.property_listings', 'hidden_images', 'UPDATE') as anon_update,
    has_column_privilege('authenticated', 'public.property_listings', 'hidden_images', 'SELECT') as auth_select,
    has_column_privilege('authenticated', 'public.property_listings', 'hidden_images', 'UPDATE') as auth_update
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE c.table_schema = 'public'
  AND c.table_name = 'property_listings'
  AND c.column_name = 'hidden_images';
