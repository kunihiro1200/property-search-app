import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { encrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAA12923MissingData() {
  console.log('🔧 Adding missing data to AA12923...\n');

  const sellerId = '0af4edbf-b3ef-4d75-810d-23e01aaac1a3';

  // Add placeholder data (you should replace with real data from spreadsheet)
  const address = '住所情報なし'; // Placeholder
  const phoneNumber = '000-0000-0000'; // Placeholder

  console.log('📝 Data to add:');
  console.log('  Address:', address);
  console.log('  Phone:', phoneNumber);

  // Encrypt the data
  const encryptedAddress = encrypt(address);
  const encryptedPhone = encrypt(phoneNumber);

  console.log('\n💾 Updating seller...');

  // Update seller
  const { error: sellerError } = await supabase
    .from('sellers')
    .update({
      address: encryptedAddress,
      phone_number: encryptedPhone,
      status: 'following_up',
    })
    .eq('id', sellerId);

  if (sellerError) {
    console.error('❌ Failed to update seller:', sellerError);
    return;
  }

  console.log('✅ Seller updated successfully');

  // Check if property exists
  const { data: existingProperty } = await supabase
    .from('properties')
    .select('id')
    .eq('seller_id', sellerId)
    .single();

  if (!existingProperty) {
    console.log('\n🏠 Creating property record...');
    
    // Create property
    const { error: propertyError } = await supabase
      .from('properties')
      .insert({
        seller_id: sellerId,
        address: '物件住所情報なし',
        property_type: 'house',
      });

    if (propertyError) {
      console.error('❌ Failed to create property:', propertyError);
      return;
    }

    console.log('✅ Property created successfully');
  } else {
    console.log('\n🏠 Property already exists');
  }

  console.log('\n🎉 AA12923 now has complete data!');
  console.log('⚠️  Note: This is placeholder data. You should update with real data from spreadsheet.');
}

addAA12923MissingData().catch(console.error);
