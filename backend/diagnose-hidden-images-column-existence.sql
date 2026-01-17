-- hidden_imagesカラムの存在を完全に診断するSQL
-- Supabaseダッシュボードで実行してください

-- 1. property_listingsテーブルの全カラムを確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
ORDER BY ordinal_position;

-- 2. hidden_imagesカラムが存在するか直接確認
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'property_listings'
      AND column_name = 'hidden_images'
) AS hidden_images_exists;

-- 3. マイグレーション077が実行されたか確認
SELECT * FROM migrations 
WHERE version = '077' 
ORDER BY executed_at DESC;

-- 4. テーブルの実際の構造を確認（psqlコマンド形式）
-- \d property_listings

-- 5. 権限を確認
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND grantee IN ('anon', 'authenticated', 'service_role');
