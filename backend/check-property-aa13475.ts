// 物件AA13475のデータを確認するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkProperty() {
  const propertyNumber = 'AA13475';
  
  console.log('='.repeat(80));
  console.log(`物件AA13475のデータ確認`);
  console.log('='.repeat(80));
  console.log();
  
  console.log('環境変数:');
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL}`);
  console.log(`  SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY?.substring(0, 20)}...`);
  console.log();
  
  // 1. property_listingsテーブルを確認
  console.log('1. property_listingsテーブルを確認:');
  const { data: propertyData, error: propertyError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', propertyNumber)
    .maybeSingle();
  
  if (propertyError) {
    console.log(`  ❌ エラー: ${propertyError.message}`);
    console.log(`  エラーコード: ${propertyError.code}`);
  } else if (!propertyData) {
    console.log(`  ❌ 物件が見つかりません`);
  } else {
    console.log(`  ✅ 物件が見つかりました`);
    console.log(`  物件番号: ${propertyData.property_number}`);
    console.log(`  住所: ${propertyData.address}`);
    console.log(`  価格: ${propertyData.price?.toLocaleString()}円`);
    console.log(`  種別: ${propertyData.property_type}`);
    console.log(`  配信エリア: ${propertyData.distribution_areas || '(未設定)'}`);
    console.log(`  Google Map URL: ${propertyData.google_map_url || '(未設定)'}`);
    console.log(`  atbb_status: ${propertyData.atbb_status || '(未設定)'}`);
  }
  console.log();
  
  // 2. sellersテーブルを確認
  console.log('2. sellersテーブルを確認:');
  const { data: sellerData, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', propertyNumber)
    .maybeSingle();
  
  if (sellerError) {
    console.log(`  ❌ エラー: ${sellerError.message}`);
  } else if (!sellerData) {
    console.log(`  ❌ 売主データが見つかりません`);
  } else {
    console.log(`  ✅ 売主データが見つかりました`);
    console.log(`  売主番号: ${sellerData.seller_number}`);
    console.log(`  住所: ${sellerData.address}`);
    console.log(`  価格: ${sellerData.price?.toLocaleString()}円`);
    console.log(`  種別: ${sellerData.property_type}`);
  }
  console.log();
  
  // 3. 全物件数を確認
  console.log('3. property_listingsテーブルの全物件数:');
  const { count, error: countError } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.log(`  ❌ エラー: ${countError.message}`);
  } else {
    console.log(`  全物件数: ${count}件`);
  }
  console.log();
  
  // 4. AA13475で始まる物件を検索
  console.log('4. AA13475で始まる物件を検索:');
  const { data: similarProperties, error: similarError } = await supabase
    .from('property_listings')
    .select('property_number, address, price')
    .like('property_number', 'AA13475%')
    .limit(10);
  
  if (similarError) {
    console.log(`  ❌ エラー: ${similarError.message}`);
  } else if (!similarProperties || similarProperties.length === 0) {
    console.log(`  ❌ 該当する物件が見つかりません`);
  } else {
    console.log(`  ✅ ${similarProperties.length}件の物件が見つかりました:`);
    similarProperties.forEach(p => {
      console.log(`    - ${p.property_number}: ${p.address} (${p.price?.toLocaleString()}円)`);
    });
  }
  console.log();
  
  console.log('='.repeat(80));
}

checkProperty()
  .then(() => {
    console.log('確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
