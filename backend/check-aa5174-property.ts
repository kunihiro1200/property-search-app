import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA5174Property() {
  console.log('=== AA5174の物件情報を確認 ===\n');
  
  // 売主情報を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, seller_number, name, address')
    .eq('seller_number', 'AA5174')
    .single();
  
  if (sellerError || !seller) {
    console.error('❌ 売主が見つかりません:', sellerError);
    return;
  }
  
  console.log('✅ 売主情報:');
  console.log('  ID:', seller.id);
  console.log('  売主番号:', seller.seller_number);
  console.log('  名前:', seller.name);
  console.log('  住所:', seller.address);
  console.log('');
  
  // 物件情報を取得
  const { data: properties, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);
  
  if (propertyError) {
    console.error('❌ 物件情報の取得エラー:', propertyError);
    return;
  }
  
  console.log(`📊 物件情報: ${properties?.length || 0}件`);
  
  if (properties && properties.length > 0) {
    properties.forEach((prop, index) => {
      console.log(`\n物件 ${index + 1}:`);
      console.log('  ID:', prop.id);
      console.log('  住所:', prop.address);
      console.log('  物件種別:', prop.property_type);
      console.log('  土地面積:', prop.land_area);
      console.log('  建物面積:', prop.building_area);
      console.log('  築年:', prop.build_year);
      console.log('  構造:', prop.structure);
      console.log('  間取り:', prop.floor_plan);
      console.log('  状況（売主）:', prop.seller_situation);
    });
  } else {
    console.log('⚠️  物件情報が存在しません');
  }
}

checkAA5174Property()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
