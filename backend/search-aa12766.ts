import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function searchAA12766() {
  console.log('=== AA12766を検索 ===\n');

  // sellersテーブル
  const { data: seller } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12766')
    .maybeSingle();

  console.log('sellersテーブル:');
  if (seller) {
    console.log(JSON.stringify(seller, null, 2));
  } else {
    console.log('  見つかりません');
  }
  console.log();

  // property_listingsテーブル
  const { data: listing } = await supabase
    .from('property_listings')
    .select('*')
    .eq('seller_number', 'AA12766')
    .maybeSingle();

  console.log('property_listingsテーブル:');
  if (listing) {
    console.log(`  売主番号: ${listing.seller_number}`);
    console.log(`  住所: ${listing.address}`);
    console.log(`  配信エリア: ${listing.distribution_areas}`);
  } else {
    console.log('  見つかりません');
  }
  console.log();

  // 似た番号を検索
  const { data: similar } = await supabase
    .from('sellers')
    .select('seller_number, property_address, distribution_areas')
    .ilike('seller_number', 'AA127%')
    .order('seller_number')
    .limit(10);

  console.log('AA127で始まる売主番号:');
  if (similar && similar.length > 0) {
    similar.forEach((s) => {
      console.log(`  ${s.seller_number}: ${s.property_address} → ${s.distribution_areas}`);
    });
  } else {
    console.log('  見つかりません');
  }
}

searchAA12766().catch(console.error);
