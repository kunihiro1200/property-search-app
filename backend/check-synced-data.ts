import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncedData() {
  console.log('🔍 Checking synced data...\n');

  // ランダムに10件の売主をチェック
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*')
    .order('seller_number', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${sellers?.length} sellers\n`);

  for (const seller of sellers || []) {
    console.log('='.repeat(60));
    console.log(`売主番号: ${seller.seller_number}`);
    console.log(`名前: ${seller.name ? decrypt(seller.name) : 'なし'}`);
    console.log(`\n【問い合わせ情報】`);
    console.log(`  サイト: ${seller.inquiry_site || '空'}`);
    console.log(`  反響日付: ${seller.inquiry_date || '空'}`);
    console.log(`  査定方法: ${seller.inquiry_source || '空'}`);
    console.log(`  連絡方法: ${seller.inquiry_medium || '空'}`);
    console.log(`  査定理由: ${seller.inquiry_content || '空'}`);
    console.log(`\n【ステータス】`);
    console.log(`  状況: ${seller.status || '空'}`);
    console.log(`  確度: ${seller.confidence || '空'}`);
    console.log(`  次電日: ${seller.next_call_date || '空'}`);
    console.log(`\n【査定】`);
    console.log(`  査定額1: ${seller.valuation_amount_1 || '空'}`);
    console.log(`  査定額2: ${seller.valuation_amount_2 || '空'}`);
    console.log(`  査定額3: ${seller.valuation_amount_3 || '空'}`);
    console.log(`  査定担当: ${seller.valuation_assignee || '空'}`);
    console.log(`\n【訪問】`);
    console.log(`  訪問日: ${seller.visit_date || '空'}`);
    console.log(`  訪問時間: ${seller.visit_time || '空'}`);
    console.log(`  営担: ${seller.visit_assignee || '空'}`);
    console.log(`  訪問査定取得者: ${seller.visit_valuation_acquirer || '空'}`);
    console.log(`\n【売主希望】`);
    console.log(`  売却理由: ${seller.sale_reason || '空'}`);
    console.log(`  希望時期: ${seller.desired_timing || '空'}`);
    console.log(`  希望価格: ${seller.desired_price || '空'}`);
    console.log(`  訪問時注意点: ${seller.notes || '空'}`);
  }

  // 物件情報もチェック
  console.log('\n\n' + '='.repeat(60));
  console.log('物件情報チェック');
  console.log('='.repeat(60));

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .limit(5);

  for (const prop of properties || []) {
    console.log(`\n売主ID: ${prop.seller_id}`);
    console.log(`  住所: ${prop.address || '空'}`);
    console.log(`  種別: ${prop.property_type || '空'}`);
    console.log(`  土地面積: ${prop.land_area || '空'}`);
    console.log(`  建物面積: ${prop.building_area || '空'}`);
    console.log(`  築年: ${prop.build_year || '空'}`);
    console.log(`  構造: ${prop.structure || '空'}`);
    console.log(`  状況（売主）: ${prop.seller_situation || '空'}`);
    console.log(`  間取り: ${prop.floor_plan || '空'}`);
  }
}

checkSyncedData().catch(console.error);
