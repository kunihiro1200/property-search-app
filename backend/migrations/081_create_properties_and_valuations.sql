-- Phase 2: Properties & Valuations - Database Schema
-- Migration 081: Create properties and valuations tables

-- ============================================================================
-- Properties Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS properties (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Property Type
  property_type VARCHAR(20) NOT NULL CHECK (property_type IN ('戸建て', '土地', 'マンション')),
  
  -- Area Information (平方メートル)
  land_area DECIMAL(10, 2),
  building_area DECIMAL(10, 2),
  land_area_verified DECIMAL(10, 2), -- 土地（当社調べ）
  building_area_verified DECIMAL(10, 2), -- 建物（当社調べ）
  
  -- Construction Information
  construction_year INTEGER, -- 築年
  structure VARCHAR(20) CHECK (structure IN ('木造', '軽量鉄骨', '鉄骨', '他')),
  
  -- Address Information
  property_address TEXT NOT NULL,
  property_address_ieul_apartment TEXT, -- イエウールのマンション専用
  
  -- Current Status
  current_status VARCHAR(20) CHECK (current_status IN ('居住中', '空き家', '賃貸中', '古屋あり', '更地')),
  
  -- Fixed Asset Tax Road Price
  fixed_asset_tax_road_price DECIMAL(15, 2),
  
  -- Floor Plan
  floor_plan TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES employees(id),
  updated_by UUID REFERENCES employees(id),
  version INTEGER DEFAULT 1 -- For optimistic locking
);

-- Indexes for properties table
CREATE INDEX IF NOT EXISTS idx_properties_seller_id ON properties(seller_id);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_construction_year ON properties(construction_year);
CREATE INDEX IF NOT EXISTS idx_properties_current_status ON properties(current_status);

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on properties
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for properties table
COMMENT ON TABLE properties IS 'Phase 2: 物件情報テーブル';
COMMENT ON COLUMN properties.id IS '物件ID';
COMMENT ON COLUMN properties.seller_id IS '売主ID（外部キー）';
COMMENT ON COLUMN properties.property_type IS '物件タイプ（戸建て、土地、マンション）';
COMMENT ON COLUMN properties.land_area IS '土地面積（平方メートル）';
COMMENT ON COLUMN properties.building_area IS '建物面積（平方メートル）';
COMMENT ON COLUMN properties.land_area_verified IS '土地面積（当社調べ）';
COMMENT ON COLUMN properties.building_area_verified IS '建物面積（当社調べ）';
COMMENT ON COLUMN properties.construction_year IS '築年';
COMMENT ON COLUMN properties.structure IS '構造（木造、軽量鉄骨、鉄骨、他）';
COMMENT ON COLUMN properties.property_address IS '物件所在地';
COMMENT ON COLUMN properties.property_address_ieul_apartment IS 'イエウール・マンション専用住所';
COMMENT ON COLUMN properties.current_status IS '現況（居住中、空き家、賃貸中、古屋あり、更地）';
COMMENT ON COLUMN properties.fixed_asset_tax_road_price IS '固定資産税路線価';
COMMENT ON COLUMN properties.floor_plan IS '間取り';
COMMENT ON COLUMN properties.version IS '楽観的ロック用バージョン番号';

-- ============================================================================
-- Valuations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS valuations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Valuation Type
  valuation_type VARCHAR(20) NOT NULL CHECK (valuation_type IN ('automatic', 'manual', 'post_visit')),
  
  -- Valuation Amounts (in Japanese Yen)
  valuation_amount_1 BIGINT NOT NULL, -- 査定額1 (Minimum)
  valuation_amount_2 BIGINT NOT NULL, -- 査定額2 (Medium)
  valuation_amount_3 BIGINT NOT NULL, -- 査定額3 (Maximum)
  
  -- Validation: Ensure ascending order
  CONSTRAINT check_valuation_order CHECK (
    valuation_amount_1 <= valuation_amount_2 AND 
    valuation_amount_2 <= valuation_amount_3
  ),
  
  -- Calculation Details (for automatic valuations)
  calculation_method TEXT,
  calculation_parameters JSONB,
  
  -- Valuation Report URL
  valuation_report_url TEXT, -- つながるオンライン査定書URL
  
  -- Metadata
  valuation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES employees(id),
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for valuations table
CREATE INDEX IF NOT EXISTS idx_valuations_property_id ON valuations(property_id);
CREATE INDEX IF NOT EXISTS idx_valuations_valuation_date ON valuations(valuation_date DESC);
CREATE INDEX IF NOT EXISTS idx_valuations_valuation_type ON valuations(valuation_type);
CREATE INDEX IF NOT EXISTS idx_valuations_created_by ON valuations(created_by);

-- Comments for valuations table
COMMENT ON TABLE valuations IS 'Phase 2: 査定情報テーブル';
COMMENT ON COLUMN valuations.id IS '査定ID';
COMMENT ON COLUMN valuations.property_id IS '物件ID（外部キー）';
COMMENT ON COLUMN valuations.valuation_type IS '査定タイプ（automatic: 自動、manual: 手動、post_visit: 訪問後）';
COMMENT ON COLUMN valuations.valuation_amount_1 IS '査定額1（最低額）';
COMMENT ON COLUMN valuations.valuation_amount_2 IS '査定額2（中間額）';
COMMENT ON COLUMN valuations.valuation_amount_3 IS '査定額3（最高額）';
COMMENT ON COLUMN valuations.calculation_method IS '計算方法';
COMMENT ON COLUMN valuations.calculation_parameters IS '計算パラメータ（JSON）';
COMMENT ON COLUMN valuations.valuation_report_url IS 'つながるオンライン査定書URL';
COMMENT ON COLUMN valuations.valuation_date IS '査定日時';
COMMENT ON COLUMN valuations.notes IS '備考';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify tables and columns exist
DO $$
DECLARE
  v_properties_exists BOOLEAN;
  v_valuations_exists BOOLEAN;
  v_construction_year_exists BOOLEAN;
BEGIN
  -- Check if properties table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'properties'
  ) INTO v_properties_exists;
  
  IF NOT v_properties_exists THEN
    RAISE EXCEPTION 'properties table was not created';
  END IF;
  
  -- Check if construction_year column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'construction_year'
  ) INTO v_construction_year_exists;
  
  IF NOT v_construction_year_exists THEN
    RAISE EXCEPTION 'construction_year column was not created in properties table';
  END IF;
  
  -- Check if valuations table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'valuations'
  ) INTO v_valuations_exists;
  
  IF NOT v_valuations_exists THEN
    RAISE EXCEPTION 'valuations table was not created';
  END IF;
  
  RAISE NOTICE 'Phase 2 tables created successfully';
  RAISE NOTICE '  - properties table: OK';
  RAISE NOTICE '  - construction_year column: OK';
  RAISE NOTICE '  - valuations table: OK';
END $$;
