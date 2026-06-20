// CC104の座標を確認するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC104Coordinates() {
  console.log('🔍 Checking CC104 coordinates...\n');

  // CC104のデータを取得
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, latitude, longitude, google_map_url, address')
    .eq('property_number', 'CC104')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data) {
    console.log('⚠️ CC104 not found');
    return;
  }

  console.log('📊 CC104 data:');
  console.log(JSON.stringify(data, null, 2));

  if (!data.latitude || !data.longitude) {
    console.log('\n⚠️ CC104 has no coordinates!');
    console.log(`Google Map URL: ${data.google_map_url}`);
    console.log(`Address: ${data.address}`);
  } else {
    console.log('\n✅ CC104 has coordinates!');
    console.log(`Latitude: ${data.latitude}`);
    console.log(`Longitude: ${data.longitude}`);
  }
}

checkCC104Coordinates().catch(console.error);
