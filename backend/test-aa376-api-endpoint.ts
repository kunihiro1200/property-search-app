/**
 * AA376のAPIエンドポイントレスポンスをテスト
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('環境変数が設定されていません');
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
  
  // APIエンドポイントを呼び出し
  const response = await fetch(`http://localhost:3000/api/sellers/${seller.id}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.error('APIエラー:', response.status, response.statusText);
    return;
  }
  
  const data = await response.json();
  
  console.log('\n=== APIレスポンス ===');
  console.log('sellerNumber:', data.sellerNumber);
  console.log('propertyAddress:', data.propertyAddress);
  console.log('propertyType:', data.propertyType);
  console.log('landArea:', data.landArea);
  console.log('buildingArea:', data.buildingArea);
  console.log('buildYear:', data.buildYear);
  console.log('structure:', data.structure);
  console.log('floorPlan:', data.floorPlan);
  console.log('valuationText:', data.valuationText);
  console.log('\n=== property オブジェクト ===');
  console.log('property:', data.property);
}

main().catch(console.error);
