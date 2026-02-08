-- Migration: 102_cleanup_buyer_field_values.sql
-- Purpose: 買主テーブルの想定外のフィールド値をクリーンアップ
-- Date: 2026-02-08
-- Related Spec: buyer-three-calls-confirmed-display-fix

-- ============================================================
-- 1. inquiry_email_phoneの想定外の値を「済」に変換
-- ============================================================
-- 想定される値: '済', '未', '不通', NULL
-- 想定外の値（例: '過去のもの'など）を「済」に統一

-- 影響を受けるレコード数を確認（実行前）
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM buyers
  WHERE inquiry_email_phone IS NOT NULL
    AND inquiry_email_phone NOT IN ('済', '未', '不通');
  
  RAISE NOTICE 'inquiry_email_phone: % records will be updated to ''済''', affected_count;
END $$;

-- 想定外の値を「済」に変換
UPDATE buyers
SET inquiry_email_phone = '済'
WHERE inquiry_email_phone IS NOT NULL
  AND inquiry_email_phone NOT IN ('済', '未', '不通');

-- ============================================================
-- 2. three_calls_confirmedの値を変換
-- ============================================================
-- 旧値 → 新値のマッピング:
-- '済' → '3回架電OK'
-- '未' → '3回架電未'
-- その他の値 → '他'

-- 影響を受けるレコード数を確認（実行前）
DO $$
DECLARE
  済_count INTEGER;
  未_count INTEGER;
  other_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO 済_count FROM buyers WHERE three_calls_confirmed = '済';
  SELECT COUNT(*) INTO 未_count FROM buyers WHERE three_calls_confirmed = '未';
  SELECT COUNT(*) INTO other_count 
  FROM buyers 
  WHERE three_calls_confirmed IS NOT NULL
    AND three_calls_confirmed NOT IN ('済', '未', '3回架電OK', '3回架電未', '他');
  
  RAISE NOTICE 'three_calls_confirmed conversion:';
  RAISE NOTICE '  ''済'' → ''3回架電OK'': % records', 済_count;
  RAISE NOTICE '  ''未'' → ''3回架電未'': % records', 未_count;
  RAISE NOTICE '  その他 → ''他'': % records', other_count;
END $$;

-- 値を変換
UPDATE buyers SET three_calls_confirmed = '3回架電OK' WHERE three_calls_confirmed = '済';
UPDATE buyers SET three_calls_confirmed = '3回架電未' WHERE three_calls_confirmed = '未';
UPDATE buyers 
SET three_calls_confirmed = '他' 
WHERE three_calls_confirmed IS NOT NULL
  AND three_calls_confirmed NOT IN ('3回架電OK', '3回架電未', '他');

-- ============================================================
-- 3. 結果の確認
-- ============================================================
DO $$
DECLARE
  inquiry_済_count INTEGER;
  inquiry_未_count INTEGER;
  inquiry_不通_count INTEGER;
  inquiry_null_count INTEGER;
  three_calls_ok_count INTEGER;
  three_calls_未_count INTEGER;
  three_calls_他_count INTEGER;
  three_calls_null_count INTEGER;
BEGIN
  -- inquiry_email_phoneの集計
  SELECT COUNT(*) INTO inquiry_済_count FROM buyers WHERE inquiry_email_phone = '済';
  SELECT COUNT(*) INTO inquiry_未_count FROM buyers WHERE inquiry_email_phone = '未';
  SELECT COUNT(*) INTO inquiry_不通_count FROM buyers WHERE inquiry_email_phone = '不通';
  SELECT COUNT(*) INTO inquiry_null_count FROM buyers WHERE inquiry_email_phone IS NULL;
  
  RAISE NOTICE '=== inquiry_email_phone 集計 ===';
  RAISE NOTICE '済: % records', inquiry_済_count;
  RAISE NOTICE '未: % records', inquiry_未_count;
  RAISE NOTICE '不通: % records', inquiry_不通_count;
  RAISE NOTICE 'NULL: % records', inquiry_null_count;
  
  -- three_calls_confirmedの集計
  SELECT COUNT(*) INTO three_calls_ok_count FROM buyers WHERE three_calls_confirmed = '3回架電OK';
  SELECT COUNT(*) INTO three_calls_未_count FROM buyers WHERE three_calls_confirmed = '3回架電未';
  SELECT COUNT(*) INTO three_calls_他_count FROM buyers WHERE three_calls_confirmed = '他';
  SELECT COUNT(*) INTO three_calls_null_count FROM buyers WHERE three_calls_confirmed IS NULL;
  
  RAISE NOTICE '=== three_calls_confirmed 集計 ===';
  RAISE NOTICE '3回架電OK: % records', three_calls_ok_count;
  RAISE NOTICE '3回架電未: % records', three_calls_未_count;
  RAISE NOTICE '他: % records', three_calls_他_count;
  RAISE NOTICE 'NULL: % records', three_calls_null_count;
END $$;
