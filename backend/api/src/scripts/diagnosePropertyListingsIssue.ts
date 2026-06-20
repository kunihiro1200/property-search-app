// property_listingsテーブルの問題を診断するスクリプト
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function diagnoseIssue() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 property_listingsテーブルの問題を診断中...\n');

  // 1. サンプルデータを取得
  const { data: samples } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, price, address, seller_name, property_type')
    .limit(10);

  console.log('📋 最初の10件のサンプルデータ:');
  samples?.forEach(p => {
    console.log(`  ${p.property_number}:`);
    console.log(`    atbb_status: ${p.atbb_status || '(null)'}`);
    console.log(`    price: ${p.price || '(null)'}`);
    console.log(`    address: ${p.address || '(null)'}`);
    console.log(`    seller_name: ${p.seller_name || '(null)'}`);
    console.log(`    property_type: ${p.property_type || '(null)'}`);
    console.log('');
  });

  // 2. nullカラムの統計
  const { data: allData } = await supabase
    .from('property_listings')
    .select('atbb_status, price, address, seller_name, property_type');

  const nullCounts = {
    atbb_status: 0,
    price: 0,
    address: 0,
    seller_name: 0,
    property_type: 0
  };

  allData?.forEach(p => {
    if (!p.atbb_status) nullCounts.atbb_status++;
    if (!p.price) nullCounts.price++;
    if (!p.address) nullCounts.address++;
    if (!p.seller_name) nullCounts.seller_name++;
    if (!p.property_type) nullCounts.property_type++;
  });

  console.log('📊 nullカラムの統計:');
  console.log(`  atbb_status: ${nullCounts.atbb_status}/${allData?.length}件がnull`);
  console.log(`  price: ${nullCounts.price}/${allData?.length}件がnull`);
  console.log(`  address: ${nullCounts.address}/${allData?.length}件がnull`);
  console.log(`  seller_name: ${nullCounts.seller_name}/${allData?.length}件がnull`);
  console.log(`  property_type: ${nullCounts.property_type}/${allData?.length}件がnull`);

  console.log('\n💡 診断結果:');
  if (nullCounts.atbb_status > allData!.length * 0.9) {
    console.log('  ❌ ほとんどの物件でatbb_statusがnullです');
    console.log('  → スプレッドシートからのデータ同期が必要です');
  }
  if (nullCounts.price > allData!.length * 0.9) {
    console.log('  ❌ ほとんどの物件で価格がnullです');
    console.log('  → スプレッドシートからのデータ同期が必要です');
  }

  process.exit(0);
}

diagnoseIssue();
