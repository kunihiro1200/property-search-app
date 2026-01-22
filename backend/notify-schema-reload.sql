-- スキーマリロードを実行
NOTIFY pgrst, 'reload schema';

-- 実行結果を確認
SELECT 'Schema reload notification sent' AS status;
