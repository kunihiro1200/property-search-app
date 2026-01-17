import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAA12923Search() {
  console.log('🔍 Debugging AA12923 search issue...\n');

  // Fetch AA12923
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923')
    .single();

  if (error || !seller) {
    console.error('❌ Failed to fetch:', error);
    return;
  }

  console.log('📊 Raw database data:');
  console.log('  ID:', seller.id);
  console.log('  Seller Number:', seller.seller_number);
  console.log('  Name (raw):', seller.name);
  console.log('  Name length:', seller.name?.length);
  console.log('  Name first 100 chars:', seller.name?.substring(0, 100));

  // Try decryption
  console.log('\n🔓 Attempting decryption...');
  try {
    const decryptedName = decrypt(seller.name);
    console.log('✅ Decrypted name:', decryptedName);
    console.log('  Length:', decryptedName.length);
    console.log('  Bytes:', Buffer.from(decryptedName).toString('hex'));
  } catch (error: any) {
    console.error('❌ Decryption failed:', error.message);
    console.error('  Stack:', error.stack);
  }

  // Check if there are multiple AA12923 records
  console.log('\n🔍 Checking for duplicate AA12923 records...');
  const { data: allAA12923, error: allError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923');

  if (allError) {
    console.error('❌ Failed to fetch all:', allError);
  } else {
    console.log(`📊 Found ${allAA12923?.length || 0} records with seller_number AA12923`);
    if (allAA12923 && allAA12923.length > 1) {
      console.log('⚠️  Multiple records found!');
      allAA12923.forEach((s, i) => {
        console.log(`\n  Record ${i + 1}:`);
        console.log('    ID:', s.id);
        console.log('    Name length:', s.name?.length);
        console.log('    Name preview:', s.name?.substring(0, 50));
        console.log('    Created:', s.created_at);
        console.log('    Updated:', s.updated_at);
      });
    }
  }

  // Simulate the search flow
  console.log('\n🔍 Simulating search flow...');
  const { data: searchResults, error: searchError } = await supabase
    .from('sellers')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (searchError) {
    console.error('❌ Search failed:', searchError);
    return;
  }

  console.log(`📊 Retrieved ${searchResults?.length || 0} sellers`);
  
  const aa12923InResults = searchResults?.find(s => s.seller_number === 'AA12923');
  if (aa12923InResults) {
    console.log('\n✅ AA12923 found in results!');
    console.log('  Name in results:', aa12923InResults.name?.substring(0, 100));
    console.log('  Matches database?', aa12923InResults.name === seller.name);
  } else {
    console.log('\n❌ AA12923 NOT in first 10 results');
  }
}

debugAA12923Search().catch(console.error);
