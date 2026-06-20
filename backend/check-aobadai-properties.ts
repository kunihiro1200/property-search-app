// 大分市青葉台エリアの物件の座標を確認するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAobadaiProperties() {
  console.log('🔍 Checking properties in 青葉台 area...\n');

  // 青葉台エリアの物件を検索
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, address, latitude, longitude, google_map_url')
    .ilike('address', '%青葉台%')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No properties found in 青葉台 area with coordinates');
    return;
  }

  console.log(`📊 Found ${data.length} properties in 青葉台 area:\n`);

  data.forEach((property) => {
    console.log(`物件番号: ${property.property_number}`);
    console.log(`住所: ${property.address}`);
    console.log(`座標: (${property.latitude}, ${property.longitude})`);
    console.log(`Google Map URL: ${property.google_map_url}`);
    console.log('---');
  });
}

checkAobadaiProperties().catch(console.error);
