import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyers() {
  console.log('=== 買主6980と6981のデータ確認 ===\n');

  // 買主6980を確認
  console.log('--- 買主6980 ---');
  const { data: buyer6980, error: error6980 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6980')
    .single();

  if (error6980) {
    console.error('買主6980の取得エラー:', error6980);
  } else if (buyer6980) {
    console.log('買主番号:', buyer6980.buyer_number);
    console.log('氏名:', buyer6980.name);
    console.log('問合せ物件番号:', buyer6980.property_number);
    console.log('問合せ時ヒアリング:', buyer6980.inquiry_hearing);
    console.log('希望種別:', buyer6980.desired_property_type);
    console.log('価格帯（戸建）:', buyer6980.price_range_house);
    console.log('価格帯（マンション）:', buyer6980.price_range_apartment);
    console.log('価格帯（土地）:', buyer6980.price_range_land);
    console.log('希望エリア:', buyer6980.desired_area);
  } else {
    console.log('買主6980が見つかりません');
  }

  console.log('\n--- 買主6981 ---');
  const { data: buyer6981, error: error6981 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6981')
    .single();

  if (error6981) {
    console.error('買主6981の取得エラー:', error6981);
  } else if (buyer6981) {
    console.log('買主番号:', buyer6981.buyer_number);
    console.log('氏名:', buyer6981.name);
    console.log('問合せ物件番号:', buyer6981.property_number);
    console.log('問合せ時ヒアリング:', buyer6981.inquiry_hearing);
    console.log('希望種別:', buyer6981.desired_property_type);
    console.log('価格帯（戸建）:', buyer6981.price_range_house);
    console.log('価格帯（マンション）:', buyer6981.price_range_apartment);
    console.log('価格帯（土地）:', buyer6981.price_range_land);
    console.log('希望エリア:', buyer6981.desired_area);
    
    // 問合せ物件番号がある場合、物件情報を確認
    if (buyer6981.property_number) {
      console.log('\n--- 問合せ物件情報 ---');
      const firstPropertyNumber = buyer6981.property_number.split(',')[0].trim();
      const { data: property, error: propertyError } = await supabase
        .from('property_listings')
        .select('property_number, property_type, price, distribution_areas')
        .eq('property_number', firstPropertyNumber)
        .single();
      
      if (propertyError) {
        console.error('物件情報の取得エラー:', propertyError);
      } else if (property) {
        console.log('物件番号:', property.property_number);
        console.log('物件種別:', property.property_type);
        console.log('価格:', property.price);
        console.log('配信エリア:', property.distribution_areas);
      }
    }
  } else {
    console.log('買主6981が見つかりません');
  }
}

checkBuyers().catch(console.error);
