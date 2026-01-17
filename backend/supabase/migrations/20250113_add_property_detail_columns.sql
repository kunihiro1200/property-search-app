-- 物件詳細情報のカラムを追加
-- これにより、スプレッドシートへのアクセスを減らし、パフォーマンスを向上させる

ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS property_about text,
ADD COLUMN IF NOT EXISTS recommended_comments jsonb,
ADD COLUMN IF NOT EXISTS athome_data jsonb,
ADD COLUMN IF NOT EXISTS favorite_comment text;

-- JSONBカラムにGINインデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_property_listings_recommended_comments ON property_listings USING gin (recommended_comments);
CREATE INDEX IF NOT EXISTS idx_property_listings_athome_data ON property_listings USING gin (athome_data);

-- コメント追加
COMMENT ON COLUMN property_listings.property_about IS '物件について（●内覧前伝達事項）';
COMMENT ON COLUMN property_listings.recommended_comments IS 'おすすめコメント（配列）';
COMMENT ON COLUMN property_listings.athome_data IS 'Athome情報（アピールポイント）';
COMMENT ON COLUMN property_listings.favorite_comment IS 'お気に入り文言';
