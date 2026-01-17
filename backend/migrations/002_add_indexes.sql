-- パフォーマンス最適化のためのインデックス追加

-- Sellers テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_assigned_to ON sellers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sellers_next_call_date ON sellers(next_call_date);
CREATE INDEX IF NOT EXISTS idx_sellers_created_at ON sellers(created_at);
CREATE INDEX IF NOT EXISTS idx_sellers_motivation ON sellers(motivation);

-- Properties テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_properties_seller_id ON properties(seller_id);
CREATE INDEX IF NOT EXISTS idx_properties_prefecture ON properties(prefecture);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);

-- Valuations テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_valuations_seller_id ON valuations(seller_id);
CREATE INDEX IF NOT EXISTS idx_valuations_calculated_at ON valuations(calculated_at);
CREATE INDEX IF NOT EXISTS idx_valuations_is_anomalous ON valuations(is_anomalous);

-- Activities テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_activities_seller_id ON activities(seller_id);
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

-- Activity_logs テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee_id ON activity_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target_type ON activity_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target_id ON activity_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Appointments テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_appointments_seller_id ON appointments(seller_id);
CREATE INDEX IF NOT EXISTS idx_appointments_employee_id ON appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_end_time ON appointments(end_time);

-- Employees テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_employees_google_id ON employees(google_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- 複合インデックス（よく使われるクエリパターン用）
CREATE INDEX IF NOT EXISTS idx_sellers_status_assigned ON sellers(status, assigned_to);
CREATE INDEX IF NOT EXISTS idx_sellers_status_next_call ON sellers(status, next_call_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee_created ON activity_logs(employee_id, created_at);
