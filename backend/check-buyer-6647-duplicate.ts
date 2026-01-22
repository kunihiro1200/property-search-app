import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer6647() {
  console.log('🔍 Checking buyer 6647 for duplicate history...\n');

  // Get buyer 6647
  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6647')
    .single();

  if (error) {
    console.error('❌ Error fetching buyer:', error);
    return;
  }

  if (!buyer) {
    console.log('❌ Buyer 6647 not found');
    return;
  }

  console.log('✅ Buyer 6647 found:');
  console.log('  ID:', buyer.id);
  console.log('  Name:', buyer.name);
  console.log('  Email:', buyer.email);
  console.log('  Property Number:', buyer.property_number);
  console.log('  Past Buyer List:', buyer.past_buyer_list);
  console.log('  Reception Date:', buyer.reception_date);
  console.log('  Inquiry Source:', buyer.inquiry_source);
  console.log('  Latest Status:', buyer.latest_status);
  console.log('');

  // Parse past buyer list
  if (buyer.past_buyer_list) {
    const pastBuyerNumbers = buyer.past_buyer_list
      .split(',')
      .map((n: string) => n.trim())
      .filter((n: string) => n);

    console.log(`📋 Past buyer numbers (${pastBuyerNumbers.length}):`);
    pastBuyerNumbers.forEach((num: string) => console.log(`  - ${num}`));
    console.log('');

    // Try to find details for each past buyer number
    if (pastBuyerNumbers.length > 0) {
      console.log('🔍 Looking up past buyer details...\n');
      
      const { data: pastBuyers, error: pastError } = await supabase
        .from('buyers')
        .select('buyer_number, property_number, reception_date, inquiry_source, latest_status, name, email')
        .in('buyer_number', pastBuyerNumbers);

      if (pastError) {
        console.error('❌ Error fetching past buyers:', pastError);
      } else if (pastBuyers && pastBuyers.length > 0) {
        console.log(`✅ Found ${pastBuyers.length} past buyer records:`);
        pastBuyers.forEach((pb: any) => {
          console.log(`\n  Buyer ${pb.buyer_number}:`);
          console.log(`    Name: ${pb.name || 'N/A'}`);
          console.log(`    Email: ${pb.email || 'N/A'}`);
          console.log(`    Property: ${pb.property_number || 'N/A'}`);
          console.log(`    Date: ${pb.reception_date || 'N/A'}`);
          console.log(`    Source: ${pb.inquiry_source || 'N/A'}`);
          console.log(`    Status: ${pb.latest_status || 'N/A'}`);
        });
      } else {
        console.log('⚠️  No past buyer records found in database');
        console.log('   (Past buyer numbers may be historical and no longer exist as separate records)');
      }
    }
  } else {
    console.log('ℹ️  No past buyer list found for buyer 6647');
  }
}

checkBuyer6647().catch(console.error);
