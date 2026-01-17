import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAA12923Email() {
  console.log('🔧 Fixing AA12923 email...\n');

  const sellerId = '0af4edbf-b3ef-4d75-810d-23e01aaac1a3';

  // Get current data
  const { data: seller, error: fetchError } = await supabase
    .from('sellers')
    .select('email')
    .eq('id', sellerId)
    .single();

  if (fetchError || !seller) {
    console.error('❌ Failed to fetch:', fetchError);
    return;
  }

  console.log('📊 Current email field exists:', !!seller.email);

  if (seller.email) {
    console.log('  Email (encrypted):', seller.email.substring(0, 50) + '...');
    console.log('  Length:', seller.email.length);

    // Try to decrypt
    try {
      const decrypted = decrypt(seller.email);
      console.log('  Decrypted:', decrypted);
      
      // Check if it looks like an email
      if (decrypted.includes('@')) {
        console.log('✅ Email is valid, no fix needed');
        return;
      } else {
        console.log('⚠️  Decrypted value is not an email, will clear it');
      }
    } catch (error) {
      console.log('❌ Decryption failed, will clear it');
    }
  }

  // Clear the corrupted email
  console.log('\n💾 Clearing corrupted email field...');
  const { error: updateError } = await supabase
    .from('sellers')
    .update({ email: null })
    .eq('id', sellerId);

  if (updateError) {
    console.error('❌ Update failed:', updateError);
    return;
  }

  console.log('✅ Email field cleared successfully');
  console.log('📝 Note: Email field is now NULL. Add correct email if available.');
}

fixAA12923Email().catch(console.error);
