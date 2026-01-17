/**
 * 最新の売主のデータ状態を確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 確認対象の売主番号
const TARGET_SELLERS = ['AA13236', 'AA13237', 'AA13239', 'AA13240', 'AA13241', 'AA13242', 'AA13243', 'AA13244'];

async function checkLatestSellersData() {
  console.log('=== 最新売主のデータ状態確認 ===\n');

  for (const sellerNumber of TARGET_SELLERS) {
    console.log(`\n【${sellerNumber}】`);
    
    // 売主情報を取得
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, seller_number, inquiry_date, status')
      .eq('seller_number', sellerNumber)
      .single();

    if (sellerError || !seller) {
      console.log(`  ❌ 売主が見つかりません`);
      continue;
    }

    console.log(`  売主ID: ${seller.id}`);
    console.log(`  反響日: ${seller.inquiry_date}`);
    console.log(`  ステータス: ${seller.status}`);

    // 物件情報を取得
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, address, property_type, land_area, building_area, build_year')
      .eq('seller_id', seller.id);

    if (propError) {
      console.log(`  ❌ 物件取得エラー: ${propError.message}`);
    } else if (!properties || properties.length === 0) {
      console.log(`  ⚠️ 物件情報: なし`);
    } else {
      console.log(`  ✅ 物件情報: ${properties.length}件`);
      properties.forEach((p: any, i: number) => {
        console.log(`     ${i+1}. 種別: ${p.property_type || '未設定'}, 土地: ${p.land_area || '-'}㎡, 建物: ${p.building_area || '-'}㎡`);
      });
    }

    // 査定情報を取得
    const { data: valuations, error: valError } = await supabase
      .from('valuations')
      .select('id, land_price, building_price, total_price')
      .eq('seller_id', seller.id);

    if (valError) {
      console.log(`  ❌ 査定取得エラー: ${valError.message}`);
    } else if (!valuations || valuations.length === 0) {
      console.log(`  ⚠️ 査定情報: なし`);
    } else {
      console.log(`  ✅ 査定情報: ${valuations.length}件`);
      valuations.forEach((v: any, i: number) => {
        console.log(`     ${i+1}. 土地: ${v.land_price || '-'}万円, 建物: ${v.building_price || '-'}万円, 合計: ${v.total_price || '-'}万円`);
      });
    }
  }

  console.log('\n=== 確認完了 ===');
}

checkLatestSellersData().catch(console.error);
