import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkPublicProperties() {
  console.log('Checking public properties...\n');
  
  // 1. 全物件数を確認
  const { count: totalCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total properties:', totalCount);
  
  // 2. atbb_status別の物件数を確認
  const { data: statusCounts } = await supabase
    .from('property_listings')
    .select('atbb_status')
    .not('atbb_status', 'is', null);
  
  const statusMap: Record<string, number> = {};
  statusCounts?.forEach(row => {
    const status = row.atbb_status || 'null';
    statusMap[status] = (statusMap[status] || 0) + 1;
  });
  
  console.log('\nProperties by atbb_status:');
  Object.entries(statusMap).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // 3. 公開中の物件を確認
  const { data: publicProperties, error } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, address, price')
    .eq('atbb_status', '公開中')
    .order('property_number', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('\nError fetching public properties:', error);
    return;
  }
  
  console.log(`\nPublic properties (公開中): ${publicProperties?.length || 0}`);
  if (publicProperties && publicProperties.length > 0) {
    publicProperties.forEach(prop => {
      console.log(`  - ${prop.property_number}: ${prop.address} (${prop.price}万円)`);
    });
  }
  
  // 4. AA13226の状態を確認
  const { data: aa13226 } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, address, price, favorite_comment, recommended_comments')
    .eq('property_number', 'AA13226')
    .single();
  
  console.log('\nAA13226 status:');
  if (aa13226) {
    console.log('  Property Number:', aa13226.property_number);
    console.log('  ATBB Status:', aa13226.atbb_status);
    console.log('  Address:', aa13226.address);
    console.log('  Price:', aa13226.price, '万円');
    console.log('  Favorite Comment:', aa13226.favorite_comment ? 'Set' : 'Not set');
    console.log('  Recommended Comments:', aa13226.recommended_comments?.length || 0, 'items');
  } else {
    console.log('  Not found');
  }
}

checkPublicProperties().catch(console.error);
