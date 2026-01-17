-- ============================================
-- マイグレーション077: hidden_imagesカラム追加
-- ============================================
-- 
-- 実行方法:
-- 1. Supabaseダッシュボードにアクセス
-- 2. SQL Editorを開く
-- 3. このSQLをコピー&ペーストして実行
--
-- ============================================

-- ステップ1: 既存のカラムを確認（エラーが出ても問題ありません）
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'property_listings' 
          AND column_name = 'hidden_images'
    ) THEN
        RAISE NOTICE 'hidden_imagesカラムは既に存在します';
    ELSE
        RAISE NOTICE 'hidden_imagesカラムを追加します';
    END IF;
END $$;

-- ステップ2: カラムを追加（存在しない場合のみ）
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ステップ3: コメントを追加
COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

-- ステップ4: インデックスを追加（配列検索用）
CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);

-- ステップ5: 権限を確認・付与
GRANT SELECT, UPDATE ON property_listings TO anon;
GRANT SELECT, UPDATE ON property_listings TO authenticated;
GRANT ALL ON property_listings TO service_role;

-- ステップ6: 確認クエリ
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND column_name = 'hidden_images';

-- 成功メッセージ
DO $$ 
BEGIN
    RAISE NOTICE '✅ マイグレーション077が正常に完了しました';
    RAISE NOTICE '✅ hidden_imagesカラムが追加されました';
    RAISE NOTICE '✅ インデックスが作成されました';
END $$;
