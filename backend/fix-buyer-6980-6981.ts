import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixBuyers() {
  console.log('=== 買主6980と6981の希望条件を自動設定 ===\n');

  // 物件情報を取得
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_type, price, distribution_areas')
    .eq('property_number', 'AA12495')
    .single();

  if (propertyError || !property) {
    console.error('物件情報の取得エラー:', propertyError);
    return;
  }

  console.log('物件情報:');
  console.log('  物件種別:', property.property_type);
  console.log('  価格:', property.price);
  console.log('  配信エリア:', property.distribution_areas);
  console.log('');

  // データベースの英語値を日本語に変換
  const propertyTypeMap: Record<string, string> = {
    'land': '土地',
    'detached_house': '戸建',
    'apartment': 'マンション',
  };
  
  const japanesePropertyType = propertyTypeMap[property.property_type] || property.property_type;

  // 価格帯を計算
  let priceRange = '';
  if (property.price < 10000000) {
    priceRange = '~1900万円';
  } else if (property.price < 30000000) {
    priceRange = '1000万円~2999万円';
  } else {
    priceRange = '2000万円以上';
  }

  console.log('自動設定する値:');
  console.log('  希望種別:', japanesePropertyType);
  console.log('  価格帯（マンション）:', priceRange);
  console.log('  希望エリア:', property.distribution_areas);
  console.log('');

  // 買主6980を更新
  console.log('--- 買主6980を更新 ---');
  const { data: buyer6980, error: error6980 } = await supabase
    .from('buyers')
    .update({
      desired_property_type: japanesePropertyType,
      price_range_apartment: priceRange,
      desired_area: property.distribution_areas,
      updated_at: new Date().toISOString(),
    })
    .eq('buyer_number', '6980')
    .select()
    .single();

  if (error6980) {
    console.error('買主6980の更新エラー:', error6980);
  } else {
    console.log('✅ 買主6980を更新しました');
    console.log('  希望種別:', buyer6980.desired_property_type);
    console.log('  価格帯（マンション）:', buyer6980.price_range_apartment);
    console.log('  希望エリア:', buyer6980.desired_area);
  }

  console.log('');

  // 買主6981を更新（希望種別は既に設定されているので、価格帯とエリアのみ）
  console.log('--- 買主6981を更新 ---');
  const { data: buyer6981, error: error6981 } = await supabase
    .from('buyers')
    .update({
      price_range_apartment: priceRange,
      desired_area: property.distribution_areas,
      updated_at: new Date().toISOString(),
    })
    .eq('buyer_number', '6981')
    .select()
    .single();

  if (error6981) {
    console.error('買主6981の更新エラー:', error6981);
  } else {
    console.log('✅ 買主6981を更新しました');
    console.log('  希望種別:', buyer6981.desired_property_type);
    console.log('  価格帯（マンション）:', buyer6981.price_range_apartment);
    console.log('  希望エリア:', buyer6981.desired_area);
  }
}

fixBuyers().catch(console.error);
