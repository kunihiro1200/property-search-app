-- appointmentsテーブルにassigned_toカラムを追加

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(50);

COMMENT ON COLUMN appointments.assigned_to IS '営業担当者のイニシャル（例: YT, KS）';
