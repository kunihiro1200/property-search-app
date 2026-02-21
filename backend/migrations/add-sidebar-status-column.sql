-- 物件リストにサイドバーステータスカラムを追加
-- 実行日: 2026-02-12

-- 1. sidebar_statusカラムを追加
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS sidebar_status TEXT;

-- 2. コメントを追加
COMMENT ON COLUMN property_listings.sidebar_status IS 'サイドバーに表示されるステータスカテゴリー（例: "未報告 山本", "未完了", "Y専任公開中"）';
