// 価格フィルター修正のテスト
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testPriceFilter() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== 価格フィルター修正のテスト ===\n');

  // テスト1: マンションで価格1000万〜1500万の物件を検索
  console.log('【テスト1】マンションで価格1000万〜1500万の物件を検索');
  console.log('検索条件:');
  console.log('  - 物件タイプ: マンション');
  console.log('  - 価格範囲: 1000万円〜1500万円（10000000円〜15000000円）\n');

  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('property_number, property_type, address, price')
    .eq('property_type', 'マンション')
    .gte('price', 10000000) // 1000万円
    .lte('price', 15000000) // 1500万円
    .order('price', { ascending: true });

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log(`検索結果: ${properties.length}件\n`);

  if (properties.length > 0) {
    console.log('物件一覧:');
    properties.forEach((prop, index) => {
      const priceInManYen = Math.round(prop.price / 10000);
      console.log(`${index + 1}. ${prop.property_number} - ${prop.address}`);
      console.log(`   価格: ${prop.price.toLocaleString()}円（${priceInManYen}万円）`);
    });
  } else {
    console.log('該当する物件が見つかりませんでした。');
  }

  console.log('\n=== テスト完了 ===');
}

testPriceFilter().catch(console.error);
