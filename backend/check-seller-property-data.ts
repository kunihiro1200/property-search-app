import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSellerPropertyData() {
  // ログから見た売主ID
  const sellerId = '0bf2f416-a503-45e9-bca8-162a2142080a';
  
  console.log('=== 売主情報確認 ===');
  console.log('売主ID:', sellerId);
  
  // 売主情報を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('id', sellerId)
    .single();
  
  if (sellerError) {
    console.error('❌ 売主取得エラー:', sellerError);
    process.exit(1);
  }
  
  console.log('\n=== 売主データ ===');
  console.log('売主番号:', seller.seller_number);
  console.log('サイト:', seller.site);
  console.log('ステータス:', seller.status);
  console.log('訪問予約日:', seller.appointment_date);
  console.log('訪問日:', seller.visit_date);
  console.log('訪問時間:', seller.visit_time);
  console.log('訪問担当者:', seller.visit_assignee);
  console.log('訪問査定取得者:', seller.visit_valuation_acquirer);
  console.log('査定額1:', seller.valuation_amount_1);
  console.log('査定額2:', seller.valuation_amount_2);
  console.log('査定額3:', seller.valuation_amount_3);
  console.log('固定資産税路線価:', seller.fixed_asset_tax_road_price);
  console.log('査定担当者:', seller.valuation_assigned_by);
  
  // 物件情報を取得
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', sellerId)
    .single();
  
  if (propertyError) {
    console.error('\n❌ 物件取得エラー:', propertyError);
  } else if (property) {
    console.log('\n=== 物件データ ===');
    console.log('物件ID:', property.id);
    console.log('物件住所:', property.address);
    console.log('物件種別:', property.property_type);
    console.log('土地面積:', property.land_area);
    console.log('建物面積:', property.building_area);
    console.log('築年:', property.build_year);
    console.log('構造:', property.structure);
    console.log('間取り:', property.floor_plan);
    console.log('状況(売主):', property.seller_situation);
  } else {
    console.log('\n⚠️ 物件情報が見つかりません');
  }
  
  process.exit(0);
}

checkSellerPropertyData();
