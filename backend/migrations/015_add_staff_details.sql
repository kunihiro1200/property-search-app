-- Migration 015: スタッフ詳細情報の追加
-- スタッフの詳細情報（イニシャル、名前、Chat webhook、電話番号）を追加

-- employeesテーブルに新しいカラムを追加
ALTER TABLE employees ADD COLUMN IF NOT EXISTS initials VARCHAR(10);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS chat_webhook_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- コメントを追加
COMMENT ON COLUMN employees.initials IS 'スタッフのイニシャル（例：KK、YY）';
COMMENT ON COLUMN employees.last_name IS '姓';
COMMENT ON COLUMN employees.first_name IS '名';
COMMENT ON COLUMN employees.chat_webhook_url IS 'Google Chat Webhook URL';
COMMENT ON COLUMN employees.phone_number IS '電話番号';

-- スタッフデータを挿入（既存のメールアドレスがあれば更新、なければ挿入）
INSERT INTO employees (google_id, email, name, role, initials, last_name, first_name, chat_webhook_url, phone_number)
VALUES 
  ('kunihiro_google_id', 'tomoko.kunihiro@ifoo-oita.com', '国広智子', 'agent', 'KK', '国広', '智子', 'https://chat.googleapis.com/v1/spaces/AAAAIiwdbiE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=8WutRn3nSL5_u4Rqs2kHtCaDmHmh41WXVvLwtoghajY', '09066394809'),
  ('yamamoto_google_id', 'yuuko.yamamoto@ifoo-oita.com', '山本裕子', 'agent', 'YY', '山本', '裕子', 'https://chat.googleapis.com/v1/spaces/AAAAmIMoj8c/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=V7kc_bpVcixLYG8pMFcahVuf5yRy-fkdGa7Uo6WAttc', '08044435905'),
  ('kakui_google_id', 'hiromitsu-kakui@ifoo-oita.com', '角井宏充', 'agent', 'II', '角井', '宏充', 'https://chat.googleapis.com/v1/spaces/AAQAn5gsjCM/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=6c_y5hinWeMw2v4C4NO4YBQ-D7ku6x88WA3o18_tSAc', '07031283766'),
  ('shouno_google_id', 'rikuto.shouno@ifoo-oita.com', '生野陸斗', 'agent', '生', '生野', '陸斗', NULL, '08097125265'),
  ('ura_google_id', 'tenma.ura@ifoo-oita.com', '裏天真', 'agent', 'UU', '裏', '天真', 'https://chat.googleapis.com/v1/spaces/AAAACve38xM/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=S7W_khARyoSdALhCJ3FJTOUFYae7NDRuE8mya9MygUk', '08034165869'),
  ('kimura_google_id', 'yurine.kimura@ifoo-oita.com', '木村侑里音', 'agent', 'RR', '木村', '侑里音', NULL, '08046223810'),
  ('kume_google_id', 'mariko.kume@ifoo-oita.com', '久米マリ子', 'agent', '久', '久米', 'マリ子', NULL, '08046223532'),
  ('hirose_google_id', 'naomi.hirose@ifoo-oita.com', '廣瀬尚美', 'agent', 'HH', '廣瀬', '尚美', NULL, '07031283763'),
  ('jimu_google_id', 'GYOSHA@ifoo-oita.com', '事務', 'admin', '事務', '事務', '', NULL, NULL),
  ('gyosha_google_id', 'tenant@ifoo-oita.com', '業者', 'agent', '業者', '業者', '', NULL, NULL)
ON CONFLICT (email) 
DO UPDATE SET
  role = EXCLUDED.role,
  initials = EXCLUDED.initials,
  last_name = EXCLUDED.last_name,
  first_name = EXCLUDED.first_name,
  chat_webhook_url = EXCLUDED.chat_webhook_url,
  phone_number = EXCLUDED.phone_number,
  name = EXCLUDED.name;
