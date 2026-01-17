-- ストアドファンクション: 物件の座標を更新
-- PostgRESTキャッシュ問題を回避するため、直接SQLで更新

CREATE OR REPLACE FUNCTION update_property_coordinates(
  p_property_number TEXT,
  p_latitude DECIMAL,
  p_longitude DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- カラムが存在しない場合は作成
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'property_listings' 
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE property_listings ADD COLUMN latitude DECIMAL(10, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'property_listings' 
    AND column_name = 'longitude'
  ) THEN
    ALTER TABLE property_listings ADD COLUMN longitude DECIMAL(11, 8);
  END IF;

  -- 座標を更新
  UPDATE property_listings
  SET 
    latitude = p_latitude,
    longitude = p_longitude
  WHERE property_number = p_property_number;
END;
$$;

-- 関数の実行権限を付与
GRANT EXECUTE ON FUNCTION update_property_coordinates(TEXT, DECIMAL, DECIMAL) TO anon;
GRANT EXECUTE ON FUNCTION update_property_coordinates(TEXT, DECIMAL, DECIMAL) TO authenticated;
