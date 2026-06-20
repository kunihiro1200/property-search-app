import { createClient } from '@supabase/supabase-js';
import { SellerService } from './src/services/SellerService.supabase';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAA13500DecryptedSeller() {
  console.log('🧪 Testing AA13500 decrypted seller data...\n');

  try {
    const sellerService = new SellerService();
    
    // AA13500のUUID
    const sellerId = '27bd1bf7-2467-4bde-b128-26e31e525f51';
    
    console.log('📥 Fetching seller from database...');
    const seller = await sellerService.getSeller(sellerId);
    
    if (!seller) {
      console.error('❌ Seller not found');
      return;
    }
    
    console.log('✅ Seller fetched successfully\n');
    console.log('📊 Seller data:');
    console.log('  ID:', seller.id);
    console.log('  Seller Number:', seller.sellerNumber);
    console.log('  Name:', seller.name);
    
    console.log('\n📋 Valuation Method field:');
    console.log('  valuationMethod:', seller.valuationMethod);
    console.log('  Type:', typeof seller.valuationMethod);
    console.log('  Is undefined?', seller.valuationMethod === undefined);
    console.log('  Is null?', seller.valuationMethod === null);
    
    console.log('\n📋 Mailing Status fields:');
    console.log('  mailingStatus:', seller.mailingStatus);
    console.log('  mailSentDate:', seller.mailSentDate);
    
    if (seller.valuationMethod) {
      console.log('\n✅ SUCCESS: valuationMethod is included in decrypted seller!');
      console.log('   Value:', seller.valuationMethod);
    } else {
      console.log('\n❌ FAILED: valuationMethod is still missing or null');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAA13500DecryptedSeller();
