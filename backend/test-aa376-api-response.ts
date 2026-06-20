/**
 * AA376のAPIレスポンスを確認
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAA376ApiResponse() {
  // データベースから直接取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('seller_number, property_address, property_type, land_area, building_area, build_year, structure, floor_plan, valuation_text')
    .eq('seller_number', 'AA376')
    .single();

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('=== AA376のデータベース値 ===');
  console.log('seller_number:', seller.seller_number);
  console.log('property_address:', seller.property_address);
  console.log('property_type:', seller.property_type);
  console.log('land_area:', seller.land_area);
  console.log('building_area:', seller.building_area);
  console.log('build_year:', seller.build_year);
  console.log('structure:', seller.structure);
  console.log('floor_plan:', seller.floor_plan);
  console.log('valuation_text:', seller.valuation_text);
}

testAA376ApiResponse().catch(console.error);
