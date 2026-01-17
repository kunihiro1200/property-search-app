-- hidden_images機能の手動テスト
-- Supabase SQL Editorで実行してください
-- hidden_imagesはtext[]型（テキスト配列）です

-- 1. AA13129の現在の状態を確認
SELECT 
  id, 
  property_number, 
  storage_location, 
  hidden_images
FROM property_listings
WHERE property_number = 'AA13129';

-- 2. テスト用のファイルIDを追加（ARRAY構文を使用）
UPDATE property_listings
SET hidden_images = 
  CASE 
    WHEN hidden_images IS NULL OR hidden_images = '{}' THEN ARRAY['test-file-id-12345']
    ELSE array_append(hidden_images, 'test-file-id-12345')
  END
WHERE property_number = 'AA13129';

-- 3. 更新後の状態を確認
SELECT 
  id, 
  property_number, 
  hidden_images
FROM property_listings
WHERE property_number = 'AA13129';

-- 4. テストファイルIDを削除（復元）
UPDATE property_listings
SET hidden_images = array_remove(hidden_images, 'test-file-id-12345')
WHERE property_number = 'AA13129';

-- 5. 復元後の状態を確認
SELECT 
  id, 
  property_number, 
  hidden_images
FROM property_listings
WHERE property_number = 'AA13129';

-- 6. 元の状態に戻す（hidden_imagesを空配列に）
UPDATE property_listings
SET hidden_images = '{}'
WHERE property_number = 'AA13129';

-- 7. 最終確認
SELECT 
  id, 
  property_number, 
  storage_location, 
  hidden_images
FROM property_listings
WHERE property_number = 'AA13129';
