import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch() {
  console.log('🔍 Testing AA12923 search...\n');

  // Simulate the search flow from SellerService
  console.log('📊 Step 1: Fetching all sellers...');
  const { data: allSellers, error } = await supabase
    .from('sellers')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('❌ Failed to fetch:', error);
    return;
  }

  console.log(`✅ Retrieved ${allSellers?.length || 0} sellers\n`);

  // Find AA12923
  const aa12923Raw = allSellers?.find(s => s.seller_number === 'AA12923');
  if (!aa12923Raw) {
    console.log('❌ AA12923 not found in first 1000 sellers!');
    return;
  }

  console.log('📊 Step 2: Found AA12923 in results');
  console.log('  ID:', aa12923Raw.id);
  console.log('  Seller Number:', aa12923Raw.seller_number);
  console.log('  Name (encrypted):', aa12923Raw.name?.substring(0, 50) + '...');

  // Decrypt
  console.log('\n📊 Step 3: Decrypting...');
  try {
    const decryptedName = decrypt(aa12923Raw.name);
    console.log('✅ Decrypted name:', decryptedName);

    // Test search queries
    console.log('\n📊 Step 4: Testing search queries...');
    
    const queries = ['AA12923', 'aa12923', '12923', '穴井', '千暁', '穴井 千暁'];
    
    for (const query of queries) {
      const lowerQuery = query.toLowerCase();
      const matches = 
        (decryptedName && decryptedName.toLowerCase().includes(lowerQuery)) ||
        (aa12923Raw.seller_number && aa12923Raw.seller_number.toLowerCase().includes(lowerQuery));
      
      console.log(`  Query "${query}": ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
    }

    console.log('\n🎉 Search test completed successfully!');
    console.log('📝 Next steps:');
    console.log('  1. Restart backend: cd backend && npm run dev');
    console.log('  2. Search for "AA12923" in browser');
    console.log('  3. Should see: 穴井 千暁');

  } catch (error: any) {
    console.error('❌ Decryption failed:', error.message);
  }
}

testSearch().catch(console.error);
