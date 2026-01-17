import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer6647() {
  console.log('=== Checking Buyer 6647 ===\n');

  try {
    // Check if buyer exists by buyer_number
    console.log('1. Checking if buyer 6647 exists in database...');
    const { data: buyerByNumber, error: numberError } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', 6647)
      .single();

    if (numberError) {
      console.error('❌ Error fetching by buyer_number:', numberError);
    } else if (buyerByNumber) {
      console.log('✅ Found buyer 6647 by buyer_number');
      console.log('   UUID:', buyerByNumber.uuid);
      console.log('   Name:', buyerByNumber.name);
      console.log('   Email:', buyerByNumber.email);
      console.log('   Phone:', buyerByNumber.phone);
    } else {
      console.log('❌ Buyer 6647 not found by buyer_number');
    }

    // Check related buyers
    if (buyerByNumber?.uuid) {
      console.log('\n2. Checking related buyers...');
      const { data: relatedBuyers, error: relatedError } = await supabase
        .from('buyers')
        .select('uuid, buyer_number, name, email')
        .eq('email', buyerByNumber.email);

      if (relatedError) {
        console.error('❌ Error fetching related buyers:', relatedError);
      } else {
        console.log(`✅ Found ${relatedBuyers?.length || 0} buyers with same email`);
        relatedBuyers?.forEach(b => {
          console.log(`   - Buyer ${b.buyer_number}: ${b.name} (${b.uuid})`);
        });
      }

      // Check inquiry history
      console.log('\n3. Checking inquiry history...');
      const { data: inquiries, error: inquiryError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('buyer_uuid', buyerByNumber.uuid)
        .eq('activity_type', 'inquiry')
        .order('created_at', { ascending: false })
        .limit(5);

      if (inquiryError) {
        console.error('❌ Error fetching inquiry history:', inquiryError);
      } else {
        console.log(`✅ Found ${inquiries?.length || 0} inquiry records`);
        inquiries?.forEach(inq => {
          console.log(`   - ${inq.created_at}: Property ${inq.property_number}`);
        });
      }
    }

    // Test the API endpoint
    console.log('\n4. Testing API endpoint /api/buyers/6647...');
    const apiUrl = `${process.env.VITE_API_URL || 'http://localhost:3000'}/api/buyers/6647`;
    console.log('   URL:', apiUrl);
    
    // Note: This would require the backend to be running
    console.log('   ⚠️  Manual test required - backend must be running');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkBuyer6647();
