import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer2044InQuery() {
  console.log('Checking if buyer 2044 is returned by the query used in EnhancedBuyerDistributionService...\n');

  // This is the exact query used in fetchAllBuyers()
  const { data, error } = await supabase
    .from('buyers')
    .select(`
      id,
      buyer_number,
      email,
      desired_area,
      distribution_type,
      latest_status,
      desired_property_type,
      price_range_apartment,
      price_range_house,
      price_range_land
    `)
    .not('email', 'is', null)
    .neq('email', '');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total buyers returned: ${data?.length || 0}`);
  
  // Find buyer 2044
  const buyer2044 = data?.find(b => b.buyer_number === '2044');
  
  if (buyer2044) {
    console.log('\n✓ Buyer 2044 IS included in the query results');
    console.log('\nBuyer 2044 details:');
    console.log(JSON.stringify(buyer2044, null, 2));
  } else {
    console.log('\n✗ Buyer 2044 is NOT included in the query results');
    
    // Check if buyer 2044 exists at all
    const { data: directCheck } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '2044')
      .single();
    
    if (directCheck) {
      console.log('\nBut buyer 2044 DOES exist in the database:');
      console.log(`  Email: "${directCheck.email}"`);
      console.log(`  Email is null: ${directCheck.email === null}`);
      console.log(`  Email is empty string: ${directCheck.email === ''}`);
      console.log(`  Email length: ${directCheck.email?.length || 0}`);
    }
  }

  // Also check for oscar.yag74@gmail.com
  const oscarBuyers = data?.filter(b => b.email === 'oscar.yag74@gmail.com');
  console.log(`\nBuyers with oscar.yag74@gmail.com: ${oscarBuyers?.length || 0}`);
  oscarBuyers?.forEach(b => {
    console.log(`  - Buyer ${b.buyer_number}`);
  });
}

checkBuyer2044InQuery().catch(console.error);
