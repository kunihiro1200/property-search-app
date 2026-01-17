-- property_listingsテーブルの完全診断SQL

-- 1. テーブルが存在するか確認
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'property_listings'
) AS table_exists;

-- 2. テーブルの所有者を確認
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'property_listings';

-- 3. テーブルの全カラム数を確認
SELECT COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings';

-- 4. テーブルのレコード数を確認
SELECT COUNT(*) AS total_records
FROM property_listings;

-- 5. PostgRESTがこのテーブルを認識しているか確認
-- （PostgRESTのスキーマキャッシュ内容）
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hastriggers
FROM pg_tables
WHERE tablename = 'property_listings';

-- 6. テーブルに対する全ての権限を確認
SELECT 
    grantee,
    string_agg(privilege_type, ', ') AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
GROUP BY grantee
ORDER BY grantee;

-- 7. テーブルのDDLを確認（CREATE TABLE文を再構築）
SELECT 
    'CREATE TABLE ' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || data_type ||
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END ||
        CASE 
            WHEN column_default IS NOT NULL 
            THEN ' DEFAULT ' || column_default
            ELSE ''
        END,
        ', '
    ) || ');' AS create_table_statement
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
GROUP BY table_name;
