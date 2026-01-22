-- Migration 095: sellersとpropertiesの関係を設定
-- これにより、SellerServiceがpropertiesテーブルを参照できるようになります

-- 1. propertiesテーブルが存在するか確認
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
    -- propertiesテーブルを作成
    CREATE TABLE properties (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
      address TEXT,
      prefecture TEXT,
      city TEXT,
      property_type TEXT,
      land_area NUMERIC,
      building_area NUMERIC,
      land_area_verified BOOLEAN DEFAULT false,
      building_area_verified BOOLEAN DEFAULT false,
      build_year INTEGER,
      structure TEXT,
      floor_plan TEXT,
      floors INTEGER,
      rooms INTEGER,
      seller_situation TEXT,
      parking TEXT,
      additional_info TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- インデックスを作成
    CREATE INDEX idx_properties_seller_id ON properties(seller_id);
    
    RAISE NOTICE 'propertiesテーブルを作成しました';
  ELSE
    RAISE NOTICE 'propertiesテーブルは既に存在します';
  END IF;
END $$;

-- 2. seller_idカラムが存在するか確認し、存在しない場合は追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE properties ADD COLUMN seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE;
    CREATE INDEX idx_properties_seller_id ON properties(seller_id);
    RAISE NOTICE 'seller_idカラムを追加しました';
  ELSE
    RAISE NOTICE 'seller_idカラムは既に存在します';
  END IF;
END $$;

-- 3. 外部キー制約が存在するか確認し、存在しない場合は追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'properties_seller_id_fkey' 
    AND table_name = 'properties'
  ) THEN
    ALTER TABLE properties 
    ADD CONSTRAINT properties_seller_id_fkey 
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE;
    RAISE NOTICE '外部キー制約を追加しました';
  ELSE
    RAISE NOTICE '外部キー制約は既に存在します';
  END IF;
END $$;

-- 4. RLSを無効化（開発環境用）
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;

-- 確認
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'properties'
  AND tc.constraint_type = 'FOREIGN KEY';
