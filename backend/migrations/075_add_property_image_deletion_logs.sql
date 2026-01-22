-- Migration: 075_add_property_image_deletion_logs
-- Description: 物件画像削除ログテーブルの作成
-- Created: 2026-01-01

-- 物件画像削除ログテーブル
CREATE TABLE IF NOT EXISTS property_image_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  image_file_id VARCHAR(255) NOT NULL,
  image_name VARCHAR(500),
  deleted_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_property_image_deletion_logs_property_id 
  ON property_image_deletion_logs(property_id);

CREATE INDEX IF NOT EXISTS idx_property_image_deletion_logs_deleted_by 
  ON property_image_deletion_logs(deleted_by);

CREATE INDEX IF NOT EXISTS idx_property_image_deletion_logs_deleted_at 
  ON property_image_deletion_logs(deleted_at);

-- コメント追加
COMMENT ON TABLE property_image_deletion_logs IS '物件画像削除ログ';
COMMENT ON COLUMN property_image_deletion_logs.id IS '削除ログID';
COMMENT ON COLUMN property_image_deletion_logs.property_id IS '物件ID';
COMMENT ON COLUMN property_image_deletion_logs.image_file_id IS 'Google DriveファイルID';
COMMENT ON COLUMN property_image_deletion_logs.image_name IS '画像ファイル名';
COMMENT ON COLUMN property_image_deletion_logs.deleted_by IS '削除実行ユーザーID';
COMMENT ON COLUMN property_image_deletion_logs.deleted_at IS '削除日時';
COMMENT ON COLUMN property_image_deletion_logs.ip_address IS '削除実行元IPアドレス';
COMMENT ON COLUMN property_image_deletion_logs.success IS '削除成功フラグ';
COMMENT ON COLUMN property_image_deletion_logs.error_message IS 'エラーメッセージ（失敗時）';
