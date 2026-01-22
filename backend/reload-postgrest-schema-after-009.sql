-- PostgRESTスキーマキャッシュをリロード
-- マイグレーション009で追加した新しいカラムを認識させる

-- 方法1: NOTIFY経由でリロード（推奨）
NOTIFY pgrst, 'reload schema';

-- 方法2: pg_notify関数を使用
SELECT pg_notify('pgrst', 'reload schema');

-- 確認: 新しいカラムが存在することを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND column_name IN ('inquiry_site', 'inquiry_year', 'confidence')
ORDER BY column_name;
