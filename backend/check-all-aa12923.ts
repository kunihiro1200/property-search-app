import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllAA12923() {
  console.log('🔍 Checking ALL AA12923 records...\n');

  // Fetch ALL sellers with AA12923
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Failed to fetch:', error);
    return;
  }

  console.log(`📊 Found ${sellers?.length || 0} records with seller_number = AA12923\n`);

  if (!sellers || sellers.length === 0) {
    console.log('❌ No AA12923 records found!');
    return;
  }

  sellers.forEach((seller, index) => {
    console.log(`\n━━━ Record ${index + 1} ━━━`);
    console.log('ID:', seller.id);
    console.log('Seller Number:', seller.seller_number);
    console.log('Created:', seller.created_at);
    console.log('Updated:', seller.updated_at);
    console.log('Name (encrypted):', seller.name?.substring(0, 80) + '...');
    console.log('Name length:', seller.name?.length);
    console.log('Address exists:', !!seller.address);
    console.log('Phone exists:', !!seller.phone_number);
    
    // Try to decrypt
    try {
      const decryptedName = decrypt(seller.name);
      console.log('✅ Decrypted name:', decryptedName);
    } catch (error: any) {
      console.log('❌ Decryption failed:', error.message);
    }
  });

  // Check if there are any with the specific encrypted value from the user's log
  const userLogEncryptedName = 'H6LIkiWqCVTkWxmUi7MQANArkgdHbnxkpqFp6LBs7DzCI2DYNrWG+Jp0TQgAniQBAs2rBcRnCi4B6DXh8aZhLAF5MA5gogUxJO1W8Jlrq5bUR0i6NEgM/1Rk4LJ3E4u9r70ScUk/4OJtVgPZRgVX0LA+Da//iF9Vb/WVDnZgPVjOROUmIdW9X26nrwj9F3/ot2nEcsh9SI0UDdfIjc4JVOr2WQPXZLQ1E25eMNKDi/yhPfCUd8USbKFLTKanTkreHyx3bshjy3y9exklYOQbBid1M/3JHzNJqZOdL7UkG4U5Vgzi+BxCrOZhZYt51qHWJcbX6oo9++0mUftP6Vq2fsGNJQin4zs9tHOpy3pV7kMn2y2fExU8tkxrpVW8eswVyh3keg9k7Dh3sDzzDJZFOksOEG9krtKvZxPR6P/t3/Vna3CGpe8ZbC7UwR6d6SkBc0znp+8oQ4UJFSR/Vqnvs9HrE2SOSQ3+f55sPcPWq44ZlEiJ52lqaHFxmvR2mXsHmposIrFwRbBORwbsSVsM8u22a3NNVHa9';
  
  console.log('\n\n🔍 Checking for the encrypted value from user log...');
  const matchingRecord = sellers.find(s => s.name === userLogEncryptedName);
  if (matchingRecord) {
    console.log('✅ Found matching record!');
    console.log('  ID:', matchingRecord.id);
    console.log('  This is the record that appeared in the search');
  } else {
    console.log('❌ No record matches the encrypted value from user log');
    console.log('  This means the data was updated after the user\'s search');
  }
}

checkAllAA12923().catch(console.error);
