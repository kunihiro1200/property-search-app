/**
 * AA13244のAPIレスポンスをシミュレートして確認
 * SellerServiceと同じロジックを使用
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testApiResponse() {
  console.log('=== AA13244のAPIレスポンス確認（SellerServiceと同じロジック） ===\n');

  // まず売主IDを取得
  const { data: sellerBasic } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_number', 'AA13244')
    .single();

  if (!sellerBasic) {
    console.error('売主が見つかりません');
    return;
  }

  const sellerId = sellerBasic.id;
  console.log(`売主ID: ${sellerId}\n`);

  // SellerServiceと同じロジックで売主情報を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('id', sellerId)
    .single();

  if (sellerError || !seller) {
    console.error('売主取得エラー:', sellerError);
    return;
  }

  // 物件情報を取得（SellerServiceと同じ）
  const { data: properties, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', sellerId);

  console.log('【売主情報】');
  console.log(`  売主番号: ${seller.seller_number}`);
  console.log(`  名前: ${seller.name ? decrypt(seller.name) : '未設定'}`);
  console.log(`  反響日: ${seller.inquiry_date}`);
  console.log(`  ステータス: ${seller.status}`);

  console.log('\n【物件クエリ結果】');
  console.log(`  エラー: ${propertyError ? propertyError.message : 'なし'}`);
  console.log(`  件数: ${properties ? properties.length : 0}`);

  if (properties && properties.length > 0) {
    const property = properties[0];
    console.log('\n【物件情報（APIが返す形式）】');
    console.log(`  id: ${property.id}`);
    console.log(`  sellerId: ${property.seller_id}`);
    console.log(`  address: ${property.address}`);
    console.log(`  propertyType: ${property.property_type}`);
    console.log(`  landArea: ${property.land_area}`);
    console.log(`  buildingArea: ${property.building_area}`);
    console.log(`  buildYear: ${property.build_year}`);
    console.log(`  structure: ${property.structure}`);
    console.log(`  floorPlan: ${property.floor_plan}`);
    console.log(`  sellerSituation: ${property.seller_situation}`);
  } else {
    console.log('\n⚠️ 物件情報が見つかりません');
  }
}

testApiResponse().catch(console.error);
