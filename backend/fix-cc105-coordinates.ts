// CC105の座標を取得して更新するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCC105Coordinates() {
  console.log('🔧 Fixing CC105 coordinates...\n');

  // Google Map URLから抽出した座標
  // URL: https://maps.app.goo.gl/xcwnydrSTgM4FmQh8
  // リダイレクト先: https://www.google.com/maps/search/33.231233,+131.576897
  const latitude = 33.231233;
  const longitude = 131.576897;

  console.log(`📍 Setting coordinates for CC105:`);
  console.log(`  Latitude: ${latitude}`);
  console.log(`  Longitude: ${longitude}\n`);

  // CC105の座標を更新
  const { data, error } = await supabase
    .from('property_listings')
    .update({
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    })
    .eq('property_number', 'CC105')
    .select();

  if (error) {
    console.error('❌ Error updating CC105:', error);
    return;
  }

  console.log('✅ CC105 coordinates updated successfully!');
  console.log('\n📊 Updated data:', JSON.stringify(data, null, 2));

  // 確認
  const { data: checkData } = await supabase
    .from('property_listings')
    .select('property_number, latitude, longitude, address')
    .eq('property_number', 'CC105')
    .single();

  console.log('\n🔍 Verification:');
  console.log(JSON.stringify(checkData, null, 2));
}

fixCC105Coordinates().catch(console.error);
