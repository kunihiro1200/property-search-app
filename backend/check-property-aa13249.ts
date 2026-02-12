import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkPropertyAA13249() {
  console.log('=== 物件AA13249のデータ確認 ===\n');

  const { data: property, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13249')
    .single();

  if (error || !property) {
    console.error('物件AA13249が見つかりません:', error);
    return;
  }

  console.log('物件番号:', property.property_number);
  console.log('種別:', property.property_type);
  console.log('価格:', property.sales_price?.toLocaleString(), '円');
  console.log('住所:', property.address);
  console.log('配信エリア (distribution_areas):', property.distribution_areas);
  console.log('配信エリア (distribution_area):', property.distribution_area);
  console.log('Google Map URL:', property.google_map_url);
  console.log('\n全フィールド:', JSON.stringify(property, null, 2));
}

checkPropertyAA13249().catch(console.error);
