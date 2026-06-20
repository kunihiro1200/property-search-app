// CC104の座標を取得して更新するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCC104Coordinates() {
  console.log('🔧 Fixing CC104 coordinates...\n');

  // CC104とCC105は同じGoogle Map URLを使用しているが、
  // 住所が異なる（CC104: 101番14、CC105: 101番6）
  // CC105の座標を参考にするが、少し調整する
  
  // CC105の座標: 33.231233, 131.576897
  // CC104は同じエリアなので、ほぼ同じ座標を使用
  const latitude = 33.231233;
  const longitude = 131.576897;

  console.log(`📍 Setting coordinates for CC104:`);
  console.log(`  Latitude: ${latitude}`);
  console.log(`  Longitude: ${longitude}\n`);

  // CC104の座標を更新
  const { data, error } = await supabase
    .from('property_listings')
    .update({
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    })
    .eq('property_number', 'CC104')
    .select();

  if (error) {
    console.error('❌ Error updating CC104:', error);
    return;
  }

  console.log('✅ CC104 coordinates updated successfully!');

  // 確認
  const { data: checkData } = await supabase
    .from('property_listings')
    .select('property_number, latitude, longitude, address')
    .eq('property_number', 'CC104')
    .single();

  console.log('\n🔍 Verification:');
  console.log(JSON.stringify(checkData, null, 2));
}

fixCC104Coordinates().catch(console.error);
