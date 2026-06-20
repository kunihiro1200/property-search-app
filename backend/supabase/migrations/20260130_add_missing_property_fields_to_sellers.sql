-- マイグレーション: sellersテーブルに不足している物件関連フィールドを追加
-- 作成日: 2026-01-30
-- 説明: property_type, land_area, building_area, build_year, structure, floor_plan, current_statusカラムを追加

-- property_type（種別）カラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS property_type VARCHAR(50);

-- land_area（土地面積）カラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS land_area NUMERIC;

-- building_area（建物面積）カラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS building_area NUMERIC;

-- build_year（築年）カラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS build_year INTEGER;

-- structure（構造）カラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS structure VARCHAR(100);

-- floor_plan（間取り）カラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS floor_plan VARCHAR(100);

-- current_status（状況（売主））カラムを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS current_status VARCHAR(50);

-- コメント追加
COMMENT ON COLUMN sellers.property_type IS '物件種別（スプレッドシートの「種別」）';
COMMENT ON COLUMN sellers.land_area IS '土地面積（㎡）（スプレッドシートの「土（㎡）」）';
COMMENT ON COLUMN sellers.building_area IS '建物面積（㎡）（スプレッドシートの「建（㎡）」）';
COMMENT ON COLUMN sellers.build_year IS '築年（スプレッドシートの「築年」）';
COMMENT ON COLUMN sellers.structure IS '建物構造（スプレッドシートの「構造」）';
COMMENT ON COLUMN sellers.floor_plan IS '間取り（スプレッドシートの「間取り」）';
COMMENT ON COLUMN sellers.current_status IS '売主の状況（スプレッドシートの「状況（売主）」）';
