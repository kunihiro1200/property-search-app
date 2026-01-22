// 物件タイプフィルターのテスト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testPropertyTypeFilter() {
  console.log('=== 物件タイプフィルターのテスト ===\n');

  // 英語→日本語のマッピング
  const propertyTypeMapping: Record<string, string> = {
    'land': '土地',
    'detached_house': '戸建',
    'apartment': 'マンション',
    'other': 'その他'
  };

  // 各物件タイプでテスト
  for (const [englishType, japaneseType] of Object.entries(propertyTypeMapping)) {
    console.log(`\n--- ${englishType} (${japaneseType}) ---`);
    
    // 公開中の物件で検索
    const { data, error, count } = await supabase
      .from('property_listings')
      .select('property_number, property_type, address, atbb_status', { count: 'exact' })
      .eq('atbb_status', '専任・公開中')
      .eq('property_type', japaneseType)
      .limit(3);

    if (error) {
      console.error('エラー:', error);
      continue;
    }

    console.log(`見つかった件数: ${count}件`);
    
    if (data && data.length > 0) {
      console.log('サンプル:');
      data.forEach(p => {
        console.log(`  - ${p.property_number}: ${p.property_type}`);
      });
    }
  }

  console.log('\n\n=== 実際のAPIリクエストをシミュレート ===\n');
  
  // 土地の検索をシミュレート
  const landType = propertyTypeMapping['land'];
  console.log(`フロントエンドから "land" を受信 → "${landType}" に変換`);
  
  const { data: landResults, error: landError, count: landCount } = await supabase
    .from('property_listings')
    .select('property_number, property_type, address, price', { count: 'exact' })
    .eq('atbb_status', '専任・公開中')
    .eq('property_type', landType)
    .order('created_at', { ascending: false })
    .limit(5);

  if (landError) {
    console.error('エラー:', landError);
  } else {
    console.log(`\n検索結果: ${landCount}件`);
    if (landResults && landResults.length > 0) {
      console.log('\n最新の土地物件:');
      landResults.forEach(p => {
        const priceStr = p.price ? `${(p.price / 10000).toLocaleString()}万円` : '価格未設定';
        console.log(`  - ${p.property_number}: ${priceStr}`);
        console.log(`    ${p.address?.substring(0, 50)}...`);
      });
    }
  }
}

testPropertyTypeFilter();
