import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13395FullData() {
  console.log('🔍 AA13395の完全なデータを確認します\n');

  // 1. 売主データを取得
  console.log('📊 ステップ1: 売主データを取得...');
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13395')
    .single();

  if (sellerError || !seller) {
    console.error('❌ 売主が見つかりません:', sellerError?.message);
    return;
  }

  console.log('✅ 売主データ:');
  console.log('   ID:', seller.id);
  console.log('   売主番号:', seller.seller_number);
  console.log('   反響年:', seller.inquiry_year);
  console.log('   サイト:', seller.inquiry_site);
  console.log('   反響日付:', seller.inquiry_date);
  console.log('   コメント:', seller.comments ? `${seller.comments.substring(0, 50)}...` : 'なし');

  // 2. 物件データを取得
  console.log('\n📊 ステップ2: 物件データを取得...');
  const { data: properties, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);

  if (propertyError) {
    console.error('❌ 物件取得エラー:', propertyError.message);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log('⚠️  物件データが見つかりません');
    console.log('\n💡 物件データを作成する必要があります');
    return;
  }

  console.log(`✅ 物件データ（${properties.length}件）:`);
  properties.forEach((property, index) => {
    console.log(`\n   物件 ${index + 1}:`);
    console.log('   ID:', property.id);
    console.log('   物件所在地 (property_address):', property.property_address);
    console.log('   住所 (address):', property.address);
    console.log('   物件種別:', property.property_type);
    console.log('   土地面積:', property.land_area);
    console.log('   建物面積:', property.building_area);
    console.log('   築年 (construction_year):', property.construction_year);
    console.log('   築年 (build_year):', property.build_year);
    console.log('   現況 (current_status):', property.current_status);
    console.log('   売主状況 (seller_situation):', property.seller_situation);
  });

  // 3. APIレスポンス形式で確認
  console.log('\n📊 ステップ3: フロントエンドで表示される形式:');
  console.log('売主情報:');
  console.log({
    id: seller.id,
    sellerNumber: seller.seller_number,
    inquiryYear: seller.inquiry_year,
    inquirySite: seller.inquiry_site,
    inquiryDate: seller.inquiry_date,
    comments: seller.comments ? `${seller.comments.substring(0, 30)}...` : null,
  });

  if (properties.length > 0) {
    const property = properties[0];
    console.log('\n物件情報:');
    console.log({
      id: property.id,
      address: property.property_address || property.address,
      propertyType: property.property_type,
      landArea: property.land_area,
      buildingArea: property.building_area,
      buildYear: property.construction_year || property.build_year,
      currentStatus: property.current_status,
    });
  }
}

checkAA13395FullData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
