/**
 * 最新売主の物件情報と査定額をDBから確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const TARGET_SELLERS = ['AA13236', 'AA13237', 'AA13239', 'AA13240', 'AA13242', 'AA13243', 'AA13244'];

async function checkLatestSellers() {
  console.log('=== 最新売主の物件情報と査定額をDBから確認 ===\n');

  for (const sellerNumber of TARGET_SELLERS) {
    console.log(`\n【${sellerNumber}】`);
    
    // 売主を取得
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3')
      .eq('seller_number', sellerNumber)
      .single();

    if (sellerError || !seller) {
      console.log('  売主が見つかりません');
      continue;
    }

    console.log(`  査定額1: ${seller.valuation_amount_1 !== null ? `${seller.valuation_amount_1 / 10000}万円` : '未設定'}`);
    console.log(`  査定額2: ${seller.valuation_amount_2 !== null ? `${seller.valuation_amount_2 / 10000}万円` : '未設定'}`);
    console.log(`  査定額3: ${seller.valuation_amount_3 !== null ? `${seller.valuation_amount_3 / 10000}万円` : '未設定'}`);

    // 物件を取得
    const { data: properties } = await supabase
      .from('properties')
      .select('address, property_type, land_area, building_area, build_year, floor_plan, seller_situation')
      .eq('seller_id', seller.id);

    if (properties && properties.length > 0) {
      const prop = properties[0];
      console.log(`  物件住所: ${prop.address}`);
      console.log(`  物件種別: ${prop.property_type}`);
      console.log(`  土地面積: ${prop.land_area}`);
      console.log(`  建物面積: ${prop.building_area}`);
      console.log(`  築年: ${prop.build_year}`);
      console.log(`  間取り: ${prop.floor_plan}`);
    }
  }
}

checkLatestSellers().catch(console.error);
