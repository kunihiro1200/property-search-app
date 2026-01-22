import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { encrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAA12923CompleteData() {
  console.log('🔧 Updating AA12923 with complete data from spreadsheet...\n');

  const sellerId = '0af4edbf-b3ef-4d75-810d-23e01aaac1a3';

  // Data from spreadsheet
  const sellerData = {
    name: '穴井 千暁',
    address: '大分県大分市豊饒３丁目11-17',
    phoneNumber: '08015353783',
    email: 'chiaki.19770801@icloud.com',
  };

  const propertyData = {
    address: '大分市豊饒３丁目11-17',
    prefecture: '大分県',
    city: '大分市',
    property_type: 'detached_house',
    structure: '木造',
  };

  console.log('📝 Seller Data:');
  console.log('  Name:', sellerData.name);
  console.log('  Address:', sellerData.address);
  console.log('  Phone:', sellerData.phoneNumber);
  console.log('  Email:', sellerData.email);

  // Encrypt seller data
  const encryptedSellerData = {
    name: encrypt(sellerData.name),
    address: encrypt(sellerData.address),
    phone_number: encrypt(sellerData.phoneNumber),
    email: encrypt(sellerData.email),
    status: 'following_up',
  };

  console.log('\n💾 Updating seller...');
  const { error: sellerError } = await supabase
    .from('sellers')
    .update(encryptedSellerData)
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
    .maybeSingle();

  if (existingProperty) {
    console.log('\n🏠 Updating existing property...');
    const { error: propertyError } = await supabase
      .from('properties')
      .update(propertyData)
      .eq('seller_id', sellerId);

    if (propertyError) {
      console.error('❌ Failed to update property:', propertyError);
      return;
    }
    console.log('✅ Property updated successfully');
  } else {
    console.log('\n🏠 Creating new property...');
    const { error: propertyError } = await supabase
      .from('properties')
      .insert({
        seller_id: sellerId,
        ...propertyData,
      });

    if (propertyError) {
      console.error('❌ Failed to create property:', propertyError);
      return;
    }
    console.log('✅ Property created successfully');
  }

  console.log('\n🎉 AA12923 now has complete data!');
  console.log('📝 Summary:');
  console.log('  ✅ Name: 穴井 千暁');
  console.log('  ✅ Address: 大分県大分市豊饒３丁目11-17');
  console.log('  ✅ Phone: 08015353783');
  console.log('  ✅ Email: chiaki.19770801@icloud.com');
  console.log('  ✅ Property: 大分市豊饒３丁目11-17');
  console.log('\n🔄 Please refresh the browser to see the updated data!');
}

updateAA12923CompleteData().catch(console.error);
