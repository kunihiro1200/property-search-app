/**
 * AA13244の物件情報をDBから直接確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkProperty() {
  console.log('=== AA13244の物件情報をDBから確認 ===\n');

  // 売主を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, seller_number, name, valuation_amount_1, valuation_amount_2, valuation_amount_3')
    .eq('seller_number', 'AA13244')
    .single();

  if (sellerError || !seller) {
    console.log('売主が見つかりません:', sellerError?.message);
    return;
  }

  console.log('【売主情報】');
  console.log(`  ID: ${seller.id}`);
  console.log(`  売主番号: ${seller.seller_number}`);
  console.log(`  名前: ${seller.name}`);
  console.log(`  査定額1: ${seller.valuation_amount_1 ? `${seller.valuation_amount_1 / 10000}万円` : '未設定'}`);
  console.log(`  査定額2: ${seller.valuation_amount_2 ? `${seller.valuation_amount_2 / 10000}万円` : '未設定'}`);
  console.log(`  査定額3: ${seller.valuation_amount_3 ? `${seller.valuation_amount_3 / 10000}万円` : '未設定'}`);

  // 物件を取得
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);

  if (propError) {
    console.log('\n物件取得エラー:', propError.message);
    return;
  }

  console.log(`\n【物件情報】(${properties?.length || 0}件)`);
  if (properties && properties.length > 0) {
    for (const prop of properties) {
      console.log(`  ID: ${prop.id}`);
      console.log(`  住所: ${prop.address}`);
      console.log(`  種別: ${prop.property_type}`);
      console.log(`  土地面積: ${prop.land_area}`);
      console.log(`  建物面積: ${prop.building_area}`);
      console.log(`  築年: ${prop.build_year}`);
      console.log(`  構造: ${prop.structure}`);
      console.log(`  間取り: ${prop.floor_plan}`);
      console.log(`  売主状況: ${prop.seller_situation}`);
      console.log(`  更新日時: ${prop.updated_at}`);
      console.log('---');
    }
  } else {
    console.log('  物件なし');
  }
}

checkProperty().catch(console.error);
