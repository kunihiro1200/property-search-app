-- ストアドファンクション: 物件詳細情報を取得
-- スキーマキャッシュ問題を回避するため、生SQLで取得

CREATE OR REPLACE FUNCTION get_property_details(p_property_number text)
RETURNS TABLE (
  property_about text,
  recommended_comments jsonb,
  athome_data jsonb,
  favorite_comment text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.property_about,
    pl.recommended_comments,
    pl.athome_data,
    pl.favorite_comment
  FROM property_listings pl
  WHERE pl.property_number = p_property_number;
END;
$$;

-- コメント追加
COMMENT ON FUNCTION get_property_details IS '物件詳細情報を取得（おすすめコメント、お気に入り文言、Athome情報、こちらの物件について）';
