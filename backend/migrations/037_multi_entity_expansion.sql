-- Migration 037: Multi-Entity Management Expansion
-- 物件(property)、買主(buyer)、案件(work)テーブルの追加

-- ============================================
-- 1. listed_properties テーブル（媒介契約物件）
-- ============================================
CREATE TABLE IF NOT EXISTS listed_properties (
    property_number VARCHAR(10) PRIMARY KEY,
    seller_number VARCHAR(10) NOT NULL REFERENCES sellers(seller_number),
    
    -- 物件情報（売主からコピー）
    address TEXT,
    property_type VARCHAR(50),
    land_area DECIMAL(10, 2),
    building_area DECIMAL(10, 2),
    build_year INTEGER,
    structure VARCHAR(50),
    
    -- 物件固有情報
    status VARCHAR(50) DEFAULT 'preparing',
    listing_price BIGINT,
    
    -- システム
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. site_registrations テーブル（サイト登録）
-- ============================================
CREATE TABLE IF NOT EXISTS site_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_number VARCHAR(10) NOT NULL REFERENCES listed_properties(property_number) ON DELETE CASCADE,
    site_name VARCHAR(50) NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    unregistered_at TIMESTAMP WITH TIME ZONE,
    unregister_reason TEXT,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(property_number, site_name)
);

-- ============================================
-- 3. buyers テーブル（買主）
-- ============================================
CREATE TABLE IF NOT EXISTS buyers (
    buyer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 連絡先（暗号化）
    name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    
    -- 状態
    confidence VARCHAR(20),
    preferred_contact_time TEXT,
    
    -- 担当
    assigned_to VARCHAR(255),
    
    -- システム
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. buyer_inquiries テーブル（買主問合せ）
-- ============================================
CREATE TABLE IF NOT EXISTS buyer_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES buyers(buyer_id) ON DELETE CASCADE,
    property_number VARCHAR(10) NOT NULL REFERENCES listed_properties(property_number) ON DELETE CASCADE,
    inquiry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    inquiry_content TEXT,
    inquiry_source VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. viewings テーブル（内覧）
-- ============================================
CREATE TABLE IF NOT EXISTS viewings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_number VARCHAR(10) NOT NULL REFERENCES listed_properties(property_number) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES buyers(buyer_id) ON DELETE CASCADE,
    viewing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    assignee VARCHAR(255),
    calendar_event_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'scheduled',
    result TEXT,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. works テーブル（案件）
-- ============================================
CREATE TABLE IF NOT EXISTS works (
    work_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_number VARCHAR(10) NOT NULL REFERENCES listed_properties(property_number) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'in_progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(property_number)
);

-- ============================================
-- 7. work_tasks テーブル（業務タスク）
-- ============================================
CREATE TABLE IF NOT EXISTS work_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES works(work_id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by VARCHAR(255),
    assignee VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. task_assignee_history テーブル（担当者変更履歴）
-- ============================================
CREATE TABLE IF NOT EXISTS task_assignee_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES work_tasks(task_id) ON DELETE CASCADE,
    previous_assignee VARCHAR(255),
    new_assignee VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by VARCHAR(255)
);

-- ============================================
-- 9. インデックス作成
-- ============================================

-- listed_properties
CREATE INDEX IF NOT EXISTS idx_listed_properties_seller_number ON listed_properties(seller_number);
CREATE INDEX IF NOT EXISTS idx_listed_properties_status ON listed_properties(status);

-- site_registrations
CREATE INDEX IF NOT EXISTS idx_site_registrations_property_number ON site_registrations(property_number);
CREATE INDEX IF NOT EXISTS idx_site_registrations_status ON site_registrations(status);

-- buyers
CREATE INDEX IF NOT EXISTS idx_buyers_confidence ON buyers(confidence);
CREATE INDEX IF NOT EXISTS idx_buyers_assigned_to ON buyers(assigned_to);

-- buyer_inquiries
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_buyer_id ON buyer_inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_property_number ON buyer_inquiries(property_number);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_inquiry_date ON buyer_inquiries(inquiry_date DESC);

-- viewings
CREATE INDEX IF NOT EXISTS idx_viewings_property_number ON viewings(property_number);
CREATE INDEX IF NOT EXISTS idx_viewings_buyer_id ON viewings(buyer_id);
CREATE INDEX IF NOT EXISTS idx_viewings_viewing_date ON viewings(viewing_date);
CREATE INDEX IF NOT EXISTS idx_viewings_status ON viewings(status);
CREATE INDEX IF NOT EXISTS idx_viewings_assignee ON viewings(assignee);

-- works
CREATE INDEX IF NOT EXISTS idx_works_property_number ON works(property_number);
CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);

-- work_tasks
CREATE INDEX IF NOT EXISTS idx_work_tasks_work_id ON work_tasks(work_id);
CREATE INDEX IF NOT EXISTS idx_work_tasks_assignee ON work_tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_work_tasks_due_date ON work_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_work_tasks_completed ON work_tasks(completed);

-- task_assignee_history
CREATE INDEX IF NOT EXISTS idx_task_assignee_history_task_id ON task_assignee_history(task_id);
