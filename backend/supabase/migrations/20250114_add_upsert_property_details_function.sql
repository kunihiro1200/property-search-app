-- property_detailsテーブルにデータをupsertするストアドファンクション
-- スキーマキャッシュ問題を回避するために使用

CREATE OR REPLACE FUNCTION upsert_property_details(
  p_property_number TEXT,
  p_property_about TEXT DEFAULT NULL,
  p_recommended_comments JSONB DEFAULT NULL,
  p_athome_data JSONB DEFAULT NULL,
  p_favorite_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO property_details (
    property_number,
    property_about,
    recommended_comments,
    athome_data,
    favorite_comment,
    created_at,
    updated_at
  ) VALUES (
    p_property_number,
    p_property_about,
    p_recommended_comments,
    p_athome_data,
    p_favorite_comment,
    NOW(),
    NOW()
  )
  ON CONFLICT (property_number) 
  DO UPDATE SET
    property_about = EXCLUDED.property_about,
    recommended_comments = EXCLUDED.recommended_comments,
    athome_data = EXCLUDED.athome_data,
    favorite_comment = EXCLUDED.favorite_comment,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in upsert_property_details: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- 関数の実行権限を付与
GRANT EXECUTE ON FUNCTION upsert_property_details TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_property_details TO service_role;
