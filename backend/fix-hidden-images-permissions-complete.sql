-- ステップ1: カラムの存在確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND column_name = 'hidden_images';

-- ステップ2: 現在の権限を確認
SELECT grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND column_name = 'hidden_images';

-- ステップ3: すべての必要な権限を付与
GRANT SELECT, INSERT, UPDATE ON public.property_listings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.property_listings TO authenticated;
GRANT ALL ON public.property_listings TO service_role;

-- ステップ4: カラムレベルの権限も明示的に付与
GRANT SELECT (hidden_images), UPDATE (hidden_images) ON public.property_listings TO anon;
GRANT SELECT (hidden_images), UPDATE (hidden_images) ON public.property_listings TO authenticated;
GRANT ALL (hidden_images) ON public.property_listings TO service_role;

-- ステップ5: PostgRESTに強制的にスキーマをリロードさせる
NOTIFY pgrst, 'reload schema';

-- ステップ6: 確認クエリ
SELECT 
  id,
  property_number,
  hidden_images,
  array_length(hidden_images, 1) as hidden_count
FROM public.property_listings
WHERE hidden_images IS NOT NULL
  AND array_length(hidden_images, 1) > 0
LIMIT 5;
