/**
 * AA13244の物件情報を直接更新
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixProperty() {
  console.log('=== AA13244の物件情報を直接更新 ===\n');

  const propertyId = 'fa2e9a62-0aea-457c-bcf2-e8e789011232';
  
  // スプレッドシートからの正しいデータ
  const updateData = {
    address: '別府市浜脇3丁目3384番地3',
    property_type: '土地',
    land_area: 62.7,
    building_area: null,
    build_year: null,
    structure: '他',
    floor_plan: null,
    seller_situation: '空',
  };

  console.log('更新データ:', updateData);

  const { data, error } = await supabase
    .from('properties')
    .update(updateData)
    .eq('id', propertyId)
    .select();

  if (error) {
    console.log('❌ 更新エラー:', error.message);
    console.log('詳細:', error);
  } else {
    console.log('✅ 更新成功');
    console.log('更新後のデータ:', data);
  }

  // 売主の査定額も更新
  const sellerId = 'f9bb1244-fed0-4213-af42-39bc25a898cd';
  const sellerUpdate = {
    valuation_amount_1: 0, // 0万円 = 0円
    updated_at: new Date().toISOString(),
  };

  console.log('\n売主の査定額を更新:', sellerUpdate);

  const { data: sellerData, error: sellerError } = await supabase
    .from('sellers')
    .update(sellerUpdate)
    .eq('id', sellerId)
    .select('id, seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3');

  if (sellerError) {
    console.log('❌ 売主更新エラー:', sellerError.message);
  } else {
    console.log('✅ 売主更新成功');
    console.log('更新後のデータ:', sellerData);
  }
}

fixProperty().catch(console.error);
