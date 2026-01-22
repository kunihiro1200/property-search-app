-- Migration 082: Expand property_type values
-- 物件種別に「アパート一棟」「その他」「事業用」を追加

-- 既存の制約を削除
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- 新しい制約を追加（より多くの物件種別を許可）
ALTER TABLE properties 
ADD CONSTRAINT properties_property_type_check 
CHECK (property_type IN ('戸建て', '土地', 'マンション', 'アパート一棟', 'その他', '事業用'));

-- コメントを追加
COMMENT ON CONSTRAINT properties_property_type_check ON properties IS '物件種別: 戸建て、土地、マンション、アパート一棟、その他、事業用';
