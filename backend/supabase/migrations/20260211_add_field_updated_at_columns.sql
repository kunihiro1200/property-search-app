-- 問合せ時ヒアリング自動反映機能のための最終更新日時カラムを追加
-- 各フィールドの最終更新日時を記録して、上書きルールを適用する

-- 問合せ時ヒアリングの最終更新日時
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS inquiry_hearing_updated_at TIMESTAMP;

-- 希望時期の最終更新日時
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS desired_timing_updated_at TIMESTAMP;

-- 駐車場希望台数の最終更新日時
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS parking_spaces_updated_at TIMESTAMP;

-- 予算の最終更新日時
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS desired_price_range_updated_at TIMESTAMP;

-- インデックスを追加（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_buyers_inquiry_hearing_updated_at ON buyers(inquiry_hearing_updated_at);
CREATE INDEX IF NOT EXISTS idx_buyers_desired_timing_updated_at ON buyers(desired_timing_updated_at);
CREATE INDEX IF NOT EXISTS idx_buyers_parking_spaces_updated_at ON buyers(parking_spaces_updated_at);
CREATE INDEX IF NOT EXISTS idx_buyers_desired_price_range_updated_at ON buyers(desired_price_range_updated_at);

-- コメントを追加
COMMENT ON COLUMN buyers.inquiry_hearing_updated_at IS '問合せ時ヒアリングの最終更新日時';
COMMENT ON COLUMN buyers.desired_timing_updated_at IS '希望時期の最終更新日時';
COMMENT ON COLUMN buyers.parking_spaces_updated_at IS '駐車場希望台数の最終更新日時';
COMMENT ON COLUMN buyers.desired_price_range_updated_at IS '予算の最終更新日時';
