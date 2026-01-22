-- Add appointment fields to sellers table
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS appointment_notes TEXT;

-- Add comment
COMMENT ON COLUMN sellers.appointment_date IS '訪問予定日時';
COMMENT ON COLUMN sellers.appointment_notes IS '訪問予約メモ';
