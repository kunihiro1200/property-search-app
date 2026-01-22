// AA5852の物件住所と配信エリアを修正
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from './src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixAA5852() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== AA5852の物件住所と配信エリア修正 ===\n');

  // 正しい物件所在地
  const correctAddress = '大分市大字常行常行180-4';
  const encryptedAddress = encrypt(correctAddress);
  
  // 常行は大分市なので、④と㊵を設定
  const correctAreas = ['④', '㊵'];
  
  console.log('修正内容:');
  console.log('  物件所在地:', correctAddress);
  console.log('  配信エリア:', correctAreas);
  
  // sellersテーブルの住所を更新
  console.log('\n1. sellersテーブルの住所を更新中...');
  const { error: sellerUpdateError } = await supabase
    .from('sellers')
    .update({
      address: encryptedAddress
    })
    .eq('seller_number', 'AA5852');

  if (sellerUpdateError) {
    console.error('sellersテーブル更新エラー:', sellerUpdateError.message);
    return;
  }
  console.log('✓ sellersテーブルの住所を更新しました');

  // property_listingsテーブルの配信エリアを更新
  console.log('\n2. property_listingsテーブルの配信エリアを更新中...');
  const { error: propertyUpdateError } = await supabase
    .from('property_listings')
    .update({
      distribution_areas: correctAreas
    })
    .eq('property_number', 'AA5852');

  if (propertyUpdateError) {
    console.error('property_listingsテーブル更新エラー:', propertyUpdateError.message);
    return;
  }
  console.log('✓ property_listingsテーブルの配信エリアを更新しました');
  
  // 確認
  console.log('\n=== 確認 ===');
  
  const { data: seller, error: sellerFetchError } = await supabase
    .from('sellers')
    .select('seller_number, address')
    .eq('seller_number', 'AA5852')
    .single();
  
  if (!sellerFetchError && seller) {
    console.log('\nsellersテーブル:');
    console.log('  売主番号:', seller.seller_number);
    console.log('  住所（暗号化）:', seller.address?.substring(0, 50) + '...');
  }

  const { data: property, error: propertyFetchError } = await supabase
    .from('property_listings')
    .select('property_number, distribution_areas')
    .eq('property_number', 'AA5852')
    .single();
  
  if (!propertyFetchError && property) {
    console.log('\nproperty_listingsテーブル:');
    console.log('  物件番号:', property.property_number);
    console.log('  配信エリア:', property.distribution_areas);
  }
}

fixAA5852().catch(console.error);
