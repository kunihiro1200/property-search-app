import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA12923FullData() {
  console.log('🔍 Checking AA12923 complete data...\n');

  // Get seller data
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923')
    .single();

  if (sellerError || !seller) {
    console.error('❌ Failed to fetch seller:', sellerError);
    return;
  }

  console.log('📊 Seller Data:');
  console.log('  ID:', seller.id);
  console.log('  Seller Number:', seller.seller_number);
  console.log('  Name (encrypted):', seller.name ? 'EXISTS' : 'NULL');
  console.log('  Address (encrypted):', seller.address ? 'EXISTS' : 'NULL');
  console.log('  Phone (encrypted):', seller.phone_number ? 'EXISTS' : 'NULL');
  console.log('  Email (encrypted):', seller.email ? 'EXISTS' : 'NULL');
  console.log('  Status:', seller.status);
  console.log('  Assigned To:', seller.assigned_to);
  console.log('  Created:', seller.created_at);
  console.log('  Updated:', seller.updated_at);

  // Try to decrypt
  console.log('\n🔓 Decrypted Values:');
  try {
    if (seller.name) {
      const name = decrypt(seller.name);
      console.log('  Name:', name);
    } else {
      console.log('  Name: NULL');
    }
  } catch (error) {
    console.log('  Name: DECRYPTION FAILED');
  }

  try {
    if (seller.address) {
      const address = decrypt(seller.address);
      console.log('  Address:', address);
    } else {
      console.log('  Address: NULL');
    }
  } catch (error) {
    console.log('  Address: DECRYPTION FAILED');
  }

  try {
    if (seller.phone_number) {
      const phone = decrypt(seller.phone_number);
      console.log('  Phone:', phone);
    } else {
      console.log('  Phone: NULL');
    }
  } catch (error) {
    console.log('  Phone: DECRYPTION FAILED');
  }

  try {
    if (seller.email) {
      const email = decrypt(seller.email);
      console.log('  Email:', email);
    } else {
      console.log('  Email: NULL');
    }
  } catch (error) {
    console.log('  Email: DECRYPTION FAILED');
  }

  // Get property data
  console.log('\n🏠 Property Data:');
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .single();

  if (propertyError) {
    console.log('  ❌ No property found:', propertyError.message);
  } else if (property) {
    console.log('  Property ID:', property.id);
    console.log('  Address:', property.address || 'NULL');
    console.log('  Prefecture:', property.prefecture || 'NULL');
    console.log('  City:', property.city || 'NULL');
    console.log('  Property Type:', property.property_type || 'NULL');
    console.log('  Land Area:', property.land_area || 'NULL');
    console.log('  Building Area:', property.building_area || 'NULL');
  }

  console.log('\n💡 Summary:');
  const hasName = !!seller.name;
  const hasAddress = !!seller.address;
  const hasPhone = !!seller.phone_number;
  const hasProperty = !!property;

  console.log(`  Name: ${hasName ? '✅' : '❌'}`);
  console.log(`  Address: ${hasAddress ? '✅' : '❌'}`);
  console.log(`  Phone: ${hasPhone ? '✅' : '❌'}`);
  console.log(`  Property: ${hasProperty ? '✅' : '❌'}`);

  if (!hasAddress || !hasPhone || !hasProperty) {
    console.log('\n⚠️  Missing data detected!');
    console.log('This seller needs to be updated with complete information.');
  }
}

checkAA12923FullData().catch(console.error);
