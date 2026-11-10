-- 公開物件サイト: 一覧カードに表示するメイン写真（Google DriveのファイルID）
-- NULL の場合は従来どおり「athome公開」フォルダ内の最新画像が使われる
ALTER TABLE public.property_listings
  ADD COLUMN IF NOT EXISTS main_image_id TEXT;

COMMENT ON COLUMN public.property_listings.main_image_id
  IS '手動指定したメイン写真のGoogle DriveファイルID（NULL=自動）';
