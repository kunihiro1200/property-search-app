import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkArea12Buyers() {
  console.log('=== Checking Buyers with Area ⑫ ===\n');

  // Check buyers who want area ⑫
  const { data, error } = await supabase
    .from('buyers')
    .select('id, email, desired_area, desired_property_type')
    .ilike('desired_area', '%⑫%')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} buyers with area ⑫ in their desired areas\n`);

  if (data && data.length > 0) {
    data.forEach((buyer, index) => {
      console.log(`Buyer ${index + 1}:`);
      console.log(`  ID: ${buyer.id}`);
      console.log(`  Email: ${buyer.email}`);
      console.log(`  Desired Area: ${buyer.desired_area}`);
      console.log(`  Desired Type: ${buyer.desired_property_type}`);
      console.log('');
    });
  } else {
    console.log('No buyers found with area ⑫');
    console.log('\nLet\'s check what areas buyers actually have:');
    
    const { data: sampleBuyers } = await supabase
      .from('buyers')
      .select('desired_area')
      .not('desired_area', 'is', null)
      .limit(20);
    
    if (sampleBuyers) {
      const uniqueAreas = new Set<string>();
      sampleBuyers.forEach(b => {
        if (b.desired_area) {
          uniqueAreas.add(b.desired_area);
        }
      });
      
      console.log('\nSample of desired_area in database:');
      Array.from(uniqueAreas).slice(0, 10).forEach(area => {
        console.log(`  - ${area}`);
      });
    }
  }
}

checkArea12Buyers().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
