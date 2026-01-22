import { SellerService } from './src/services/SellerService.supabase';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSearch() {
  console.log('🔍 Testing search for AA12923...\n');

  // First, verify AA12923 exists in database
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: directCheck, error: directError } = await supabase
    .from('sellers')
    .select('id, seller_number, name, address, phone_number')
    .eq('seller_number', 'AA12923')
    .single();

  if (directError) {
    console.error('❌ Direct database check failed:', directError);
  } else {
    console.log('✅ Direct database check - AA12923 exists:');
    console.log('  ID:', directCheck.id);
    console.log('  Seller Number:', directCheck.seller_number);
    console.log('  Name (encrypted):', directCheck.name ? 'Yes' : 'No');
    console.log('  Address (encrypted):', directCheck.address ? 'Yes' : 'No');
    console.log('  Phone (encrypted):', directCheck.phone_number ? 'Yes' : 'No');
    console.log('');
  }

  // Now test the search service
  const sellerService = new SellerService();

  try {
    console.log('🔍 Testing searchSellers method...\n');
    const results = await sellerService.searchSellers('AA12923');
    console.log(`✅ Found ${results.length} sellers\n`);

    if (results.length > 0) {
      for (const seller of results) {
        console.log('📋 Seller:');
        console.log('  ID:', seller.id);
        console.log('  Seller Number:', seller.sellerNumber);
        console.log('  Name:', seller.name);
        console.log('  Address:', seller.address);
        console.log('  Phone:', seller.phoneNumber);
        console.log('  Status:', seller.status);
        console.log('  Created:', seller.createdAt);
        console.log('');
      }
    } else {
      console.log('❌ No sellers found through searchSellers');
    }
  } catch (error) {
    console.error('❌ Search error:', error);
  }
}

testSearch().catch(console.error);
