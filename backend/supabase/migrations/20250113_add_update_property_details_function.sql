-- ストアドファンクション: 物件の追加詳細情報を更新
-- スキーマキャッシュ問題を回避するため、直接SQLで更新

CREATE OR REPLACE FUNCTION update_property_details(
  p_property_number TEXT,
  p_property_about TEXT DEFAULT NULL,
  p_recommended_comments JSONB DEFAULT NULL,
  p_athome_data JSONB DEFAULT NULL,
  p_favorite_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE property_listings
  SET
    property_about = COALESCE(p_property_about, property_about),
    recommended_comments = COALESCE(p_recommended_comments, recommended_comments),
    athome_data = COALESCE(p_athome_data, athome_data),
    favorite_comment = COALESCE(p_favorite_comment, favorite_comment),
    updated_at = NOW()
  WHERE property_number = p_property_number;
  
  RETURN FOUND;
END;
$$;

-- 関数の説明を追加
COMMENT ON FUNCTION update_property_details IS '物件の追加詳細情報を更新（スキーマキャッシュ問題を回避）';
