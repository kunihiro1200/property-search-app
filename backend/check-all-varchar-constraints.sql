-- すべてのVARCHAR制約を確認
-- Supabase SQL Editorで実行してください

-- 1. buyersテーブルのすべてのカラムとデータ型を確認
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'buyers'
ORDER BY ordinal_position;

-- 2. VARCHAR(50)のカラムだけを抽出
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'buyers'
  AND data_type = 'character varying'
  AND character_maximum_length = 50
ORDER BY column_name;

-- 3. すべてのVARCHARカラムを確認（長さ指定あり）
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'buyers'
  AND data_type = 'character varying'
  AND character_maximum_length IS NOT NULL
ORDER BY character_maximum_length, column_name;
