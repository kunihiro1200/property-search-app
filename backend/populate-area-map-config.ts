import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== Populating area_map_config table ===\n');

  // Check if table exists
  const { error: checkError } = await supabase
    .from('area_map_config')
    .select('area_number')
    .limit(1);

  if (checkError) {
    console.error('❌ Table does not exist or cannot be accessed:', checkError.message);
    console.log('\nPlease run the migration first using Supabase dashboard or SQL editor.');
    return;
  }

  // Area map data
  const areaMapData = [
    { area_number: '①', google_map_url: 'https://maps.app.goo.gl/6SUp2oApoATE4R336', city_name: null, is_active: true },
    { area_number: '②', google_map_url: 'https://maps.app.goo.gl/3tXJJ3zPDhAXnxJk9', city_name: null, is_active: true },
    { area_number: '③', google_map_url: 'https://maps.app.goo.gl/9CvuwKdgGCpM7kiT7', city_name: null, is_active: true },
    { area_number: '④', google_map_url: 'https://maps.app.goo.gl/FAh59DdyR3Xrpn2d7', city_name: null, is_active: true },
    { area_number: '⑤', google_map_url: null, city_name: null, is_active: false },
    { area_number: '⑥', google_map_url: 'https://maps.app.goo.gl/LWcdvysji8MzrC4a6', city_name: null, is_active: true },
    { area_number: '⑦', google_map_url: 'https://maps.app.goo.gl/s5RNPErktbAB3xxs7', city_name: null, is_active: true },
    { area_number: '⑧', google_map_url: 'https://maps.app.goo.gl/4UJ6Dcfniv5HnJV67', city_name: null, is_active: true },
    { area_number: '⑨', google_map_url: 'https://maps.app.goo.gl/RFxMmCWuqNBw1UR87', city_name: null, is_active: true },
    { area_number: '⑩', google_map_url: 'https://maps.app.goo.gl/LQrdiaZjij6R69fx9', city_name: null, is_active: true },
    { area_number: '⑪', google_map_url: 'https://maps.app.goo.gl/Lia3s1spu2giyaBJ9', city_name: null, is_active: true },
    { area_number: '⑫', google_map_url: 'https://maps.app.goo.gl/qkaDsYW4HFpx9x8x9', city_name: null, is_active: true },
    { area_number: '⑬', google_map_url: 'https://maps.app.goo.gl/hPndBk6HxPvdfFBz9', city_name: null, is_active: true },
    { area_number: '⑭', google_map_url: 'https://maps.app.goo.gl/ZWYbTxb2Dnq6B6ka8', city_name: null, is_active: true },
    { area_number: '⑮', google_map_url: 'https://maps.app.goo.gl/rAMak435w8Q33qJo8', city_name: null, is_active: true },
    { area_number: '㊵', google_map_url: null, city_name: '大分市', is_active: true },
    { area_number: '㊶', google_map_url: null, city_name: '別府市', is_active: true },
  ];

  console.log(`Inserting ${areaMapData.length} area configurations...\n`);

  for (const area of areaMapData) {
    const { error } = await supabase
      .from('area_map_config')
      .upsert(area, { onConflict: 'area_number' });

    if (error) {
      console.error(`❌ Failed to insert ${area.area_number}:`, error.message);
    } else {
      console.log(`✅ Inserted/Updated ${area.area_number}`);
    }
  }

  // Verify
  const { data: allData, error: verifyError } = await supabase
    .from('area_map_config')
    .select('*')
    .eq('is_active', true);

  if (verifyError) {
    console.error('\n❌ Failed to verify:', verifyError.message);
  } else {
    console.log(`\n✅ Total active configurations: ${allData?.length || 0}`);
  }
}

main();
