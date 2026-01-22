-- 売主リスト管理システム - 初期スキーマ

-- Employees テーブル
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'agent', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Sellers テーブル
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- 暗号化されたデータ
    address TEXT NOT NULL, -- 暗号化されたデータ
    phone_number TEXT NOT NULL, -- 暗号化されたデータ
    email TEXT, -- 暗号化されたデータ
    status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'following_up', 'appointment_scheduled', 'visited', 'contracted', 'lost')),
    motivation VARCHAR(50) CHECK (motivation IN ('high', 'medium', 'low')),
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    next_call_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Properties テーブル
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    address VARCHAR(500) NOT NULL,
    prefecture VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('detached_house', 'apartment', 'land', 'commercial')),
    land_area DECIMAL(10, 2),
    building_area DECIMAL(10, 2),
    build_year INTEGER,
    structure VARCHAR(100),
    floors INTEGER,
    rooms INTEGER,
    parking BOOLEAN,
    additional_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Valuations テーブル
CREATE TABLE IF NOT EXISTS valuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    estimated_price BIGINT NOT NULL,
    price_min BIGINT NOT NULL,
    price_max BIGINT NOT NULL,
    calculation_basis TEXT NOT NULL,
    is_anomalous BOOLEAN DEFAULT false,
    warnings TEXT[],
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activities テーブル
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('phone_call', 'email', 'sms', 'hearing', 'appointment')),
    content TEXT NOT NULL,
    result TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity_logs テーブル
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments テーブル
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(500) NOT NULL,
    calendar_event_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_sellers_status ON sellers(status);
CREATE INDEX idx_sellers_next_call_date ON sellers(next_call_date);
CREATE INDEX idx_sellers_assigned_to ON sellers(assigned_to);
CREATE INDEX idx_sellers_created_at ON sellers(created_at DESC);

CREATE INDEX idx_properties_seller_id ON properties(seller_id);
CREATE INDEX idx_properties_property_type ON properties(property_type);

CREATE INDEX idx_valuations_seller_id ON valuations(seller_id);
CREATE INDEX idx_valuations_calculated_at ON valuations(calculated_at DESC);

CREATE INDEX idx_activities_seller_id ON activities(seller_id);
CREATE INDEX idx_activities_employee_id ON activities(employee_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_type ON activities(type);

CREATE INDEX idx_activity_logs_employee_id ON activity_logs(employee_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);

CREATE INDEX idx_appointments_seller_id ON appointments(seller_id);
CREATE INDEX idx_appointments_employee_id ON appointments(employee_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);

-- 全文検索用のインデックス（日本語対応）
-- 注: 暗号化されたデータには使用できないため、アプリケーション層で検索を実装
-- CREATE INDEX idx_sellers_search ON sellers USING gin(to_tsvector('japanese', name || ' ' || address || ' ' || phone_number));

-- Updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE employees IS '社員情報';
COMMENT ON TABLE sellers IS '売主情報（個人情報は暗号化）';
COMMENT ON TABLE properties IS '物件情報';
COMMENT ON TABLE valuations IS '査定結果';
COMMENT ON TABLE activities IS '追客活動履歴';
COMMENT ON TABLE activity_logs IS 'システム活動ログ';
COMMENT ON TABLE appointments IS '訪問査定予約';
