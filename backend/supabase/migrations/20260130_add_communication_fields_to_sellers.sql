-- マイグレーション: 通話モード - コミュニケーションフィールド追加
-- 作成日: 2026-01-30
-- 説明: sellersテーブルに電話担当、連絡取りやすい日時、連絡方法のカラムを追加

-- 電話担当（任意）カラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS phone_contact_person VARCHAR(255);

-- 連絡取りやすい日、時間帯カラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT;

-- 連絡方法カラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS contact_method TEXT;

-- コメント追加
COMMENT ON COLUMN sellers.phone_contact_person IS '電話担当（任意）- スタッフのイニシャル';
COMMENT ON COLUMN sellers.preferred_contact_time IS '連絡取りやすい日、時間帯';
COMMENT ON COLUMN sellers.contact_method IS '連絡方法';
