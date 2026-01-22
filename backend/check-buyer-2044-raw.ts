import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer2044() {
  console.log('Checking buyer 2044 raw data...\n');

  // Get buyer 2044
  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '2044')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Buyer 2044 Raw Data:');
  console.log(JSON.stringify(buyer, null, 2));
  console.log('\n');

  // Check specific fields
  console.log('Key Fields:');
  console.log(`  buyer_number: "${buyer.buyer_number}"`);
  console.log(`  email: "${buyer.email}"`);
  console.log(`  distribution_type: "${buyer.distribution_type}"`);
  console.log(`  distribution_type (raw bytes): ${Buffer.from(buyer.distribution_type || '', 'utf8').toString('hex')}`);
  console.log(`  latest_status: "${buyer.latest_status}"`);
  console.log(`  desired_area: "${buyer.desired_area}"`);
  console.log(`  desired_property_type: "${buyer.desired_property_type}"`);
  console.log('\n');

  // Check if distribution_type matches expected values
  const distType = buyer.distribution_type?.trim() || '';
  console.log('Distribution Type Check:');
  console.log(`  Trimmed value: "${distType}"`);
  console.log(`  Length: ${distType.length}`);
  console.log(`  === "要": ${distType === '要'}`);
  console.log(`  === "mail": ${distType === 'mail'}`);
  console.log(`  === "配信希望": ${distType === '配信希望'}`);
  console.log(`  includes "LINE→mail": ${distType.includes('LINE→mail')}`);
  console.log('\n');

  // Check all buyers with oscar.yag74@gmail.com
  const { data: allOscarBuyers } = await supabase
    .from('buyers')
    .select('buyer_number, distribution_type, latest_status')
    .eq('email', 'oscar.yag74@gmail.com');

  console.log('All buyers with oscar.yag74@gmail.com:');
  allOscarBuyers?.forEach(b => {
    console.log(`  ${b.buyer_number}: distribution_type="${b.distribution_type}", status="${b.latest_status}"`);
  });
}

checkBuyer2044().catch(console.error);
