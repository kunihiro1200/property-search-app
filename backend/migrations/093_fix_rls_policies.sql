-- Migration 093: RLS (Row Level Security) ポリシーの修正
-- 売主データへのアクセスを許可

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON sellers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON sellers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON sellers;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON sellers;

-- 認証済みユーザーに対して全アクセスを許可
CREATE POLICY "Enable read access for authenticated users"
ON sellers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON sellers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON sellers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON sellers FOR DELETE
TO authenticated
USING (true);

-- サービスロールに対しても全アクセスを許可（バックエンドからのアクセス用）
CREATE POLICY "Enable all access for service role"
ON sellers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLSが有効になっているか確認
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- 確認用クエリ
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
WHERE tablename = 'sellers';
