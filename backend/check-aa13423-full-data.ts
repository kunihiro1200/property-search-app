import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13423FullData() {
  console.log('🔍 AA13423の完全なデータを確認\n');

  // 1. 売主データを確認
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13423')
    .single();

  if (sellerError) {
    console.error('❌ 売主データ取得エラー:', sellerError);
    return;
  }

  console.log('📊 売主データ:');
  console.log(`   ID: ${seller.id}`);
  console.log(`   売主番号: ${seller.seller_number}`);
  console.log(`   inquiry_year: ${seller.inquiry_year}`);
  console.log(`   inquiry_site: ${seller.inquiry_site}`);
  console.log(`   inquiry_date: ${seller.inquiry_date || '(null)'}`);
  console.log(`   inquiry_detailed_datetime: ${seller.inquiry_detailed_datetime || '(null)'}`);
  console.log(`   status: ${seller.status}`);
  console.log('');

  // 2. 物件データを確認
  const { data: properties, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);

  if (propertyError) {
    console.error('❌ 物件データ取得エラー:', propertyError);
    return;
  }

  console.log('🏠 物件データ:');
  if (!properties || properties.length === 0) {
    console.log('   ❌ 物件データが見つかりません');
  } else {
    console.log(`   ✅ ${properties.length}件の物件が見つかりました`);
    properties.forEach((prop, index) => {
      console.log(`\n   物件 ${index + 1}:`);
      console.log(`     ID: ${prop.id}`);
      console.log(`     住所: ${prop.address || '(null)'}`);
      console.log(`     都道府県: ${prop.prefecture || '(null)'}`);
      console.log(`     市区町村: ${prop.city || '(null)'}`);
      console.log(`     物件種別: ${prop.property_type || '(null)'}`);
      console.log(`     土地面積: ${prop.land_area || '(null)'}`);
      console.log(`     建物面積: ${prop.building_area || '(null)'}`);
    });
  }
  console.log('');

  // 3. スプレッドシートのデータと比較
  console.log('📋 問題の診断:');
  
  if (!seller.inquiry_date) {
    console.log('   ⚠️  inquiry_dateがnullです');
    console.log('   → スプレッドシートの「反響日」カラムを確認してください');
  }
  
  if (!properties || properties.length === 0) {
    console.log('   ⚠️  物件データが存在しません');
    console.log('   → この売主に紐づく物件を作成する必要があります');
  }
}

checkAA13423FullData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
