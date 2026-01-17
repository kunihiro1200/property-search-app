import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13423Property() {
  console.log('🏠 AA13423の物件データを確認\n');

  // 売主IDを取得
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, seller_number')
    .eq('seller_number', 'AA13423')
    .single();

  if (!seller) {
    console.error('❌ 売主が見つかりません');
    return;
  }

  // 物件データを取得
  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log('⚠️  物件データが見つかりません');
    return;
  }

  console.log(`✅ ${properties.length}件の物件が見つかりました\n`);
  
  properties.forEach((prop, index) => {
    console.log(`物件 ${index + 1}:`);
    console.log(`  ID: ${prop.id}`);
    console.log(`  住所: ${prop.property_address}`);
    console.log(`  種別: ${prop.property_type}`);
    console.log(`  土地面積: ${prop.land_area}㎡`);
    console.log(`  建物面積: ${prop.building_area}㎡`);
    console.log(`  現況: ${prop.current_status}`);
    console.log(`  構造: ${prop.structure || '(なし)'}`);
    console.log(`  間取り: ${prop.floor_plan || '(なし)'}`);
    console.log(`  築年: ${prop.construction_year || '(なし)'}`);
    console.log('');
  });
}

checkAA13423Property()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
