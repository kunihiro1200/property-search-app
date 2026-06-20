/**
 * AA376のSellerServiceレスポンスをテスト
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '.env.local') });

import { SellerService } from './src/services/SellerService.supabase';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('環境変数が設定されていません');
    console.log('SUPABASE_URL:', supabaseUrl);
    console.log('SUPABASE_SERVICE_KEY:', supabaseKey ? '設定済み' : '未設定');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // AA376のUUIDを取得
  const { data: seller } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_number', 'AA376')
    .single();
  
  if (!seller) {
    console.error('AA376が見つかりません');
    return;
  }
  
  console.log('AA376のUUID:', seller.id);
  
  // SellerServiceでデータを取得
  const sellerService = new SellerService();
  const result = await sellerService.getSeller(seller.id);
  
  console.log('\n=== SellerService.getSeller() レスポンス ===');
  console.log('sellerNumber:', result.sellerNumber);
  console.log('propertyAddress:', result.propertyAddress);
  console.log('propertyType:', result.propertyType);
  console.log('landArea:', result.landArea);
  console.log('buildingArea:', result.buildingArea);
  console.log('buildYear:', result.buildYear);
  console.log('structure:', result.structure);
  console.log('floorPlan:', result.floorPlan);
  console.log('valuationText:', result.valuationText);
  console.log('\n=== property オブジェクト ===');
  console.log('property:', result.property);
}

main().catch(console.error);
