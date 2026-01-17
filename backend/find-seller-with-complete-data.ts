import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findSellerWithCompleteData() {
  console.log('=== 完全なデータを持つ売主を検索 ===\n');
  
  // 物件情報がある売主を検索
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select(`
      id,
      seller_number,
      site,
      status,
      appointment_date,
      visit_date,
      valuation_amount_1,
      valuation_amount_2,
      valuation_amount_3,
      properties (
        id,
        address,
        property_type,
        land_area,
        building_area,
        seller_situation
      )
    `)
    .not('site', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
  
  console.log(`✅ ${sellers?.length || 0}件の売主が見つかりました\n`);
  
  for (const seller of sellers || []) {
    const hasProperty = seller.properties && (Array.isArray(seller.properties) ? seller.properties.length > 0 : true);
    const property = Array.isArray(seller.properties) ? seller.properties[0] : seller.properties;
    
    console.log('---');
    console.log('売主番号:', seller.seller_number);
    console.log('サイト:', seller.site);
    console.log('ステータス:', seller.status);
    console.log('訪問予約日:', seller.appointment_date);
    console.log('訪問日:', seller.visit_date);
    console.log('査定額1:', seller.valuation_amount_1);
    console.log('物件情報:', hasProperty ? '✅' : '❌');
    if (hasProperty && property) {
      console.log('  - 物件住所:', property.address);
      console.log('  - 物件種別:', property.property_type);
      console.log('  - 状況(売主):', property.seller_situation);
    }
    console.log('');
  }
  
  process.exit(0);
}

findSellerWithCompleteData();
