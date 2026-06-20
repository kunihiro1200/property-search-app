-- マイグレーション: sellersテーブルにunreachable_statusカラムを追加
-- 作成日: 2026年1月28日
-- 目的: 通話モードで「不通」フィールドを管理するためのカラムを追加
-- 注意: 反響日付が2026年1月1日以降の売主には必須項目

-- unreachable_statusカラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS unreachable_status VARCHAR(20) NULL;

-- カラムにコメントを追加
COMMENT ON COLUMN sellers.unreachable_status IS '不通フィールド: 不通、通電OK（反響日付が2026年1月1日以降の場合は必須）';

-- インデックスを追加（ステータス計算で使用するため）
CREATE INDEX IF NOT EXISTS idx_sellers_unreachable_status 
ON sellers(unreachable_status);

-- CHECK制約を追加（有効な値のみを許可）
ALTER TABLE sellers
ADD CONSTRAINT chk_unreachable_status 
CHECK (unreachable_status IN ('不通', '通電OK') OR unreachable_status IS NULL);
