-- Migration 081 補完: 不足しているカラムを追加
-- このスクリプトは、Migration 081実行後に不足しているカラムを追加します

-- ============================================================================
-- Properties テーブルに不足しているカラムを追加
-- ============================================================================

-- construction_year カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'construction_year'
  ) THEN
    ALTER TABLE properties ADD COLUMN construction_year INTEGER;
    RAISE NOTICE 'Added construction_year column to properties table';
  ELSE
    RAISE NOTICE 'construction_year column already exists in properties table';
  END IF;
END $$;

-- property_address カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'property_address'
  ) THEN
    ALTER TABLE properties ADD COLUMN property_address TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added property_address column to properties table';
  ELSE
    RAISE NOTICE 'property_address column already exists in properties table';
  END IF;
END $$;

-- property_address_ieul_apartment カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'property_address_ieul_apartment'
  ) THEN
    ALTER TABLE properties ADD COLUMN property_address_ieul_apartment TEXT;
    RAISE NOTICE 'Added property_address_ieul_apartment column to properties table';
  ELSE
    RAISE NOTICE 'property_address_ieul_apartment column already exists in properties table';
  END IF;
END $$;

-- current_status カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'current_status'
  ) THEN
    ALTER TABLE properties ADD COLUMN current_status VARCHAR(20) CHECK (current_status IN ('居住中', '空き家', '賃貸中', '古屋あり', '更地'));
    RAISE NOTICE 'Added current_status column to properties table';
  ELSE
    RAISE NOTICE 'current_status column already exists in properties table';
  END IF;
END $$;

-- fixed_asset_tax_road_price カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'fixed_asset_tax_road_price'
  ) THEN
    ALTER TABLE properties ADD COLUMN fixed_asset_tax_road_price DECIMAL(15, 2);
    RAISE NOTICE 'Added fixed_asset_tax_road_price column to properties table';
  ELSE
    RAISE NOTICE 'fixed_asset_tax_road_price column already exists in properties table';
  END IF;
END $$;

-- updated_at カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE properties ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    RAISE NOTICE 'Added updated_at column to properties table';
  ELSE
    RAISE NOTICE 'updated_at column already exists in properties table';
  END IF;
END $$;

-- created_by カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE properties ADD COLUMN created_by UUID REFERENCES employees(id);
    RAISE NOTICE 'Added created_by column to properties table';
  ELSE
    RAISE NOTICE 'created_by column already exists in properties table';
  END IF;
END $$;

-- updated_by カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE properties ADD COLUMN updated_by UUID REFERENCES employees(id);
    RAISE NOTICE 'Added updated_by column to properties table';
  ELSE
    RAISE NOTICE 'updated_by column already exists in properties table';
  END IF;
END $$;

-- version カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'version'
  ) THEN
    ALTER TABLE properties ADD COLUMN version INTEGER DEFAULT 1;
    RAISE NOTICE 'Added version column to properties table';
  ELSE
    RAISE NOTICE 'version column already exists in properties table';
  END IF;
END $$;

-- ============================================================================
-- Valuations テーブルに不足しているカラムを追加
-- ============================================================================

-- property_id カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'property_id'
  ) THEN
    ALTER TABLE valuations ADD COLUMN property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added property_id column to valuations table';
  ELSE
    RAISE NOTICE 'property_id column already exists in valuations table';
  END IF;
END $$;

-- valuation_type カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'valuation_type'
  ) THEN
    ALTER TABLE valuations ADD COLUMN valuation_type VARCHAR(20) NOT NULL CHECK (valuation_type IN ('automatic', 'manual', 'post_visit'));
    RAISE NOTICE 'Added valuation_type column to valuations table';
  ELSE
    RAISE NOTICE 'valuation_type column already exists in valuations table';
  END IF;
END $$;

-- valuation_amount_1 カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'valuation_amount_1'
  ) THEN
    ALTER TABLE valuations ADD COLUMN valuation_amount_1 BIGINT NOT NULL;
    RAISE NOTICE 'Added valuation_amount_1 column to valuations table';
  ELSE
    RAISE NOTICE 'valuation_amount_1 column already exists in valuations table';
  END IF;
END $$;

-- valuation_amount_2 カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'valuation_amount_2'
  ) THEN
    ALTER TABLE valuations ADD COLUMN valuation_amount_2 BIGINT NOT NULL;
    RAISE NOTICE 'Added valuation_amount_2 column to valuations table';
  ELSE
    RAISE NOTICE 'valuation_amount_2 column already exists in valuations table';
  END IF;
END $$;

-- valuation_amount_3 カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'valuation_amount_3'
  ) THEN
    ALTER TABLE valuations ADD COLUMN valuation_amount_3 BIGINT NOT NULL;
    RAISE NOTICE 'Added valuation_amount_3 column to valuations table';
  ELSE
    RAISE NOTICE 'valuation_amount_3 column already exists in valuations table';
  END IF;
END $$;

-- calculation_method カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'calculation_method'
  ) THEN
    ALTER TABLE valuations ADD COLUMN calculation_method TEXT;
    RAISE NOTICE 'Added calculation_method column to valuations table';
  ELSE
    RAISE NOTICE 'calculation_method column already exists in valuations table';
  END IF;
END $$;

-- calculation_parameters カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'calculation_parameters'
  ) THEN
    ALTER TABLE valuations ADD COLUMN calculation_parameters JSONB;
    RAISE NOTICE 'Added calculation_parameters column to valuations table';
  ELSE
    RAISE NOTICE 'calculation_parameters column already exists in valuations table';
  END IF;
END $$;

-- valuation_report_url カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'valuation_report_url'
  ) THEN
    ALTER TABLE valuations ADD COLUMN valuation_report_url TEXT;
    RAISE NOTICE 'Added valuation_report_url column to valuations table';
  ELSE
    RAISE NOTICE 'valuation_report_url column already exists in valuations table';
  END IF;
END $$;

-- valuation_date カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'valuation_date'
  ) THEN
    ALTER TABLE valuations ADD COLUMN valuation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    RAISE NOTICE 'Added valuation_date column to valuations table';
  ELSE
    RAISE NOTICE 'valuation_date column already exists in valuations table';
  END IF;
END $$;

-- created_by カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE valuations ADD COLUMN created_by UUID REFERENCES employees(id);
    RAISE NOTICE 'Added created_by column to valuations table';
  ELSE
    RAISE NOTICE 'created_by column already exists in valuations table';
  END IF;
END $$;

-- notes カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE valuations ADD COLUMN notes TEXT;
    RAISE NOTICE 'Added notes column to valuations table';
  ELSE
    RAISE NOTICE 'notes column already exists in valuations table';
  END IF;
END $$;

-- created_at カラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'valuations' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE valuations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    RAISE NOTICE 'Added created_at column to valuations table';
  ELSE
    RAISE NOTICE 'created_at column already exists in valuations table';
  END IF;
END $$;

-- ============================================================================
-- インデックスの追加（存在しない場合のみ）
-- ============================================================================

-- Properties テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_properties_construction_year ON properties(construction_year);
CREATE INDEX IF NOT EXISTS idx_properties_current_status ON properties(current_status);

-- Valuations テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_valuations_property_id ON valuations(property_id);
CREATE INDEX IF NOT EXISTS idx_valuations_valuation_date ON valuations(valuation_date DESC);
CREATE INDEX IF NOT EXISTS idx_valuations_valuation_type ON valuations(valuation_type);
CREATE INDEX IF NOT EXISTS idx_valuations_created_by ON valuations(created_by);

-- ============================================================================
-- トリガーの追加（存在しない場合のみ）
-- ============================================================================

-- update_updated_at_column 関数が存在しない場合は作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Properties テーブルのトリガー
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 制約の追加（存在しない場合のみ）
-- ============================================================================

-- Valuations テーブルの CHECK 制約
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_valuation_order' 
    AND conrelid = 'valuations'::regclass
  ) THEN
    ALTER TABLE valuations ADD CONSTRAINT check_valuation_order CHECK (
      valuation_amount_1 <= valuation_amount_2 AND 
      valuation_amount_2 <= valuation_amount_3
    );
    RAISE NOTICE 'Added check_valuation_order constraint to valuations table';
  ELSE
    RAISE NOTICE 'check_valuation_order constraint already exists in valuations table';
  END IF;
END $$;

-- ============================================================================
-- 最終確認
-- ============================================================================

DO $$
DECLARE
  v_properties_columns INTEGER;
  v_valuations_columns INTEGER;
BEGIN
  -- Properties テーブルのカラム数を確認
  SELECT COUNT(*) INTO v_properties_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'properties';
  
  -- Valuations テーブルのカラム数を確認
  SELECT COUNT(*) INTO v_valuations_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'valuations';
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '補完スクリプト実行完了';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Properties テーブル: % カラム', v_properties_columns;
  RAISE NOTICE 'Valuations テーブル: % カラム', v_valuations_columns;
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '1. 検証スクリプトを実行: cd backend && npx ts-node migrations/verify-081-migration.ts';
  RAISE NOTICE '2. 全てのカラムが正しく作成されたことを確認';
  RAISE NOTICE '================================================';
END $$;
