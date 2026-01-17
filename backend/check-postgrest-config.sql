-- PostgRESTの設定とスキーマキャッシュの状態を確認

-- 1. 現在のデータベース設定を確認
SHOW server_version;
SHOW max_connections;

-- 2. property_listingsテーブルの完全な構造を確認
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
ORDER BY ordinal_position;

-- 3. hidden_imagesカラムの制約を確認
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'property_listings'
  AND kcu.column_name = 'hidden_images';

-- 4. RLSポリシーを確認
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'property_listings';
