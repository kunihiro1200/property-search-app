// スクリプト: Google Map URLの存在確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkGoogleMapUrls() {
  console.log('Checking Google Map URLs in property_listings...\n');

  // Google Map URLが存在する物件を取得
  const { data: withUrls, error: error1 } = await supabase
    .from('property_listings')
    .select('property_number, google_map_url')
    .not('google_map_url', 'is', null)
    .limit(10);

  if (error1) {
    console.error('Error fetching properties with URLs:', error1);
    return;
  }

  console.log(`Found ${withUrls?.length || 0} properties with Google Map URLs (showing first 10):`);
  withUrls?.forEach(prop => {
    console.log(`  ${prop.property_number}: ${prop.google_map_url}`);
  });

  // 全体の統計
  const { count: totalCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });

  const { count: withUrlCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('google_map_url', 'is', null);

  console.log(`\nStatistics:`);
  console.log(`  Total properties: ${totalCount}`);
  console.log(`  With Google Map URL: ${withUrlCount}`);
  console.log(`  Without Google Map URL: ${(totalCount || 0) - (withUrlCount || 0)}`);
}

checkGoogleMapUrls().catch(console.error);
