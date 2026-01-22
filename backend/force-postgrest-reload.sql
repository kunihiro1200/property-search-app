-- PostgRESTにスキーマキャッシュのリロードを強制的に通知
-- Supabase Dashboard → SQL Editor で実行してください

-- 方法1: NOTIFY経由でPostgRESTに通知
NOTIFY pgrst, 'reload schema';

-- 方法2: スキーマキャッシュを強制的にクリア
-- (Supabaseの内部テーブルを使用)
SELECT pg_notify('pgrst', 'reload schema');

-- 確認: buyers テーブルのカラム一覧を表示
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'buyers'
    AND column_name = 'last_synced_at';
