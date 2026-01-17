-- hidden_imagesカラムへの権限を明示的に付与

-- 1. anonロールに権限を付与
GRANT SELECT ON property_listings TO anon;
GRANT SELECT (hidden_images) ON property_listings TO anon;

-- 2. authenticated ロールに権限を付与
GRANT SELECT ON property_listings TO authenticated;
GRANT SELECT (hidden_images) ON property_listings TO authenticated;

-- 3. service_roleには全権限
GRANT ALL ON property_listings TO service_role;

-- 4. PostgRESTにリロードを通知
NOTIFY pgrst, 'reload schema';

-- 5. 確認
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'property_listings'
  AND table_schema = 'public';
