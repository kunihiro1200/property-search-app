-- property_listingsテーブルにis_hiddenカラムを追加
-- スプレッドシートから削除された物件を公開サイトから非表示にするためのフラグ

ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

-- パフォーマンス向上のためインデックスを作成
CREATE INDEX IF NOT EXISTS idx_property_listings_is_hidden
  ON property_listings (is_hidden);

COMMENT ON COLUMN property_listings.is_hidden IS 'スプレッドシートから削除された物件を公開サイトから非表示にするフラグ。trueの場合、公開物件サイトに表示されない。';
