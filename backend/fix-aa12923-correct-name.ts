import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { encrypt, decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAA12923Name() {
  console.log('🔧 Checking and fixing AA12923...\n');

  // Get current data
  const { data: seller, error: fetchError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923')
    .single();

  if (fetchError || !seller) {
    console.error('❌ Failed to fetch AA12923:', fetchError);
    return;
  }

  console.log('📊 Current AA12923 data:');
  console.log('  ID:', seller.id);
  console.log('  Seller Number:', seller.seller_number);
  console.log('  Name (encrypted):', seller.name?.substring(0, 50) + '...');
  console.log('  Name length:', seller.name?.length);

  // Try to decrypt current name
  console.log('\n🔓 Attempting to decrypt current name...');
  try {
    const decryptedName = decrypt(seller.name);
    console.log('✅ Current decrypted name:', decryptedName);
    
    if (decryptedName === '穴井 千暁') {
      console.log('✅ Name is already correct! No update needed.');
      return;
    }
    
    console.log('⚠️  Name is incorrect, will update to: 穴井 千暁');
  } catch (error: any) {
    console.log('❌ Failed to decrypt:', error.message);
    console.log('⚠️  Data appears to be corrupted, will re-encrypt with correct name');
  }

  // Set correct name
  const correctName = '穴井 千暁';
  console.log('\n🔐 Encrypting correct name:', correctName);
  const encryptedName = encrypt(correctName);
  console.log('✅ Encrypted name:', encryptedName.substring(0, 50) + '...');
  console.log('  Length:', encryptedName.length);

  // Verify encryption works
  console.log('\n🔍 Verifying encryption...');
  try {
    const testDecrypt = decrypt(encryptedName);
    console.log('✅ Test decryption successful:', testDecrypt);
  } catch (error) {
    console.error('❌ Test decryption failed! Aborting update.');
    return;
  }

  // Update database
  console.log('\n💾 Updating database...');
  const { error: updateError } = await supabase
    .from('sellers')
    .update({ name: encryptedName })
    .eq('seller_number', 'AA12923');

  if (updateError) {
    console.error('❌ Update error:', updateError);
    return;
  }

  console.log('✅ Successfully updated AA12923 name to: 穴井 千暁');

  // Verify update
  console.log('\n🔍 Verifying update...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923')
    .single();

  if (verifyError || !verifyData) {
    console.error('❌ Verification failed:', verifyError);
    return;
  }

  try {
    const verifiedName = decrypt(verifyData.name);
    console.log('✅ Verified name in database:', verifiedName);
    console.log('🎉 AA12923 is now correctly set and searchable!');
  } catch (error) {
    console.error('❌ Verification decryption failed:', error);
  }
}

fixAA12923Name().catch(console.error);
