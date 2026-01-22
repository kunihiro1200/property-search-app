-- PostgRESTスキーマキャッシュの強制リロード (方法2)

-- 1. PostgRESTに通知を送信
NOTIFY pgrst, 'reload schema';

-- 2. 少し待つ(この間にPostgRESTがリロードする)
SELECT pg_sleep(2);

-- 3. 確認: property_listingsテーブルのカラム一覧
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
ORDER BY ordinal_position;

-- 4. hidden_imagesカラムの存在確認
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'property_listings'
    AND column_name = 'hidden_images'
) AS hidden_images_exists;
