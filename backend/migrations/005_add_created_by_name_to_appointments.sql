-- appointmentsテーブルにcreated_by_nameカラムを追加

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);

COMMENT ON COLUMN appointments.created_by_name IS '予約作成者の名前（Googleアカウント名）';
