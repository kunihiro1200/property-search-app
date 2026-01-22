-- ============================================================================
-- 092 sellersテーブルを制約なしで再作成
-- Supabase SQL Editorで実行してください
-- ============================================================================

-- Step 1: 既存のsellersテーブルを削除（CASCADE）
DROP TABLE IF EXISTS sellers CASCADE;

-- Step 2: 制約なしでsellersテーブルを再作成
CREATE TABLE sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- 基本情報（すべてNULL許可、制約なし）
    name TEXT,
    address TEXT,
    phone_number TEXT,
    email TEXT,
    
    -- ステータス情報（制約なし）
    status VARCHAR(100),
    assignee VARCHAR(100),
    seller_situation VARCHAR(200),
    
    -- 査定額
    valuation_amount_1 BIGINT,
    valuation_amount_2 BIGINT,
    valuation_amount_3 BIGINT,
    post_visit_valuation_amount_1 BIGINT,
    valuation_method VARCHAR(100),
    valuation_pdf_url TEXT,
    
    -- その他
    contract_year_month DATE,
    visit_assignee VARCHAR(100),
    next_call_date DATE,
    
    -- システムカラム
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Step 3: インデックスを作成
CREATE INDEX idx_sellers_seller_number ON sellers(seller_number);
CREATE INDEX idx_sellers_status ON sellers(status);
CREATE INDEX idx_sellers_created_at ON sellers(created_at DESC);
CREATE INDEX idx_sellers_deleted_at ON sellers(deleted_at);

-- Step 4: updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sellers_updated_at ON sellers;
CREATE TRIGGER update_sellers_updated_at 
BEFORE UPDATE ON sellers
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Step 5: RLSを有効化
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- サービスロールには全アクセスを許可
DROP POLICY IF EXISTS "Service role has full access to sellers" ON sellers;
CREATE POLICY "Service role has full access to sellers"
ON sellers FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 認証済みユーザーには読み取りと更新を許可
DROP POLICY IF EXISTS "Authenticated users can read sellers" ON sellers;
CREATE POLICY "Authenticated users can read sellers"
ON sellers FOR SELECT TO authenticated
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can update sellers" ON sellers;
CREATE POLICY "Authenticated users can update sellers"
ON sellers FOR UPDATE TO authenticated
USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can insert sellers" ON sellers;
CREATE POLICY "Authenticated users can insert sellers"
ON sellers FOR INSERT TO authenticated
WITH CHECK (true);

-- 完了メッセージ
DO $$ 
BEGIN
  RAISE NOTICE '✅ sellersテーブルを制約なしで再作成しました';
  RAISE NOTICE '次のステップ: npx ts-node sync-all-sellers-from-sheet.ts を実行してください';
END $$;
