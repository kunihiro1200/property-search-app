-- サイドバーステータスカラムにインデックスを作成
-- 実行日: 2026-02-12

-- サイドバーでのグループ化を高速化
CREATE INDEX IF NOT EXISTS idx_property_listings_sidebar_status 
ON property_listings(sidebar_status);
