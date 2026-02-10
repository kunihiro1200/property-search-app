-- 買主6951のデータ確認
SELECT 
  buyer_number,
  name,
  property_number,
  broker_survey,
  inquiry_source,
  reception_date,
  latest_status
FROM buyers
WHERE buyer_number = '6951';

-- AA1949の物件情報確認
SELECT 
  property_number,
  address,
  display_address,
  property_type,
  price,
  atbb_status
FROM property_listings
WHERE property_number = 'AA1949';
