-- ============================================================
-- Migration 056: Verify Table and Reload PostgREST Cache
-- ============================================================
-- このSQLをSupabase SQL Editorで実行してください
-- https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/editor

-- ステップ1: テーブルの存在確認
-- ============================================================
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'email_history'
    ) THEN '✅ email_history table EXISTS'
    ELSE '❌ email_history table DOES NOT EXIST - Run migration 056 first!'
  END AS table_status;

-- ステップ2: テーブル構造の確認（存在する場合）
-- ============================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'email_history'
ORDER BY ordinal_position;

-- ステップ3: PostgRESTキャッシュの強制リロード
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ステップ4: 確認メッセージ
-- ============================================================
SELECT 
  '✅ Schema reload notification sent to PostgREST' AS status,
  'Wait 2-3 minutes, then test with: npx ts-node check-email-history-table.ts' AS next_step;

-- ============================================================
-- 注意事項:
-- 1. ステップ1で「DOES NOT EXIST」が表示された場合:
--    → backend/migrations/056_add_email_history.sql を実行
-- 2. ステップ1で「EXISTS」が表示された場合:
--    → 2-3分待ってからテストを実行
-- 3. それでも404エラーが出る場合:
--    → プロジェクトを再起動（Pause → Resume → 10分待つ）
-- ============================================================
