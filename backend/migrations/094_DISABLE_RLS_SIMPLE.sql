-- Migration 094: RLSを無効化（開発環境用）
-- これにより、認証なしでもデータにアクセスできるようになります

-- sellersテーブルのRLSを無効化
ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;

-- 確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'sellers';
