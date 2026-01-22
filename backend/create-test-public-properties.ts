import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function createTestProperties() {
  console.log('🏠 Creating test public properties...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get some existing properties
    console.log('1. Fetching existing properties...');
    const { data: properties, error: fetchError } = await supabase
      .from('property_listings')
      .select('id, property_number, address, price, property_type')
      .limit(5);

    if (fetchError) {
      throw new Error(`Failed to fetch properties: ${fetchError.message}`);
    }

    if (!properties || properties.length === 0) {
      console.log('   ⚠️  No properties found in database');
      return;
    }

    console.log(`   ✅ Found ${properties.length} properties\n`);

    // Update first 3 properties to be public
    console.log('2. Setting properties to public display...');
    const propertiesToUpdate = properties.slice(0, 3);

    for (const property of propertiesToUpdate) {
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({
          site_display: 'サイト表示',
          remarks: `${property.address}の物件です。広々とした間取りで、駅から徒歩圏内の好立地です。詳細はお問い合わせください。`
        })
        .eq('id', property.id);

      if (updateError) {
        console.log(`   ⚠️  Failed to update ${property.property_number}: ${updateError.message}`);
      } else {
        console.log(`   ✅ ${property.property_number} - ${property.address}`);
      }
    }

    console.log('\n3. Verifying public properties...');
    const { data: publicProps, error: verifyError } = await supabase
      .from('property_listings')
      .select('property_number, address, price, property_type, site_display')
      .eq('site_display', 'サイト表示');

    if (verifyError) {
      throw new Error(`Failed to verify: ${verifyError.message}`);
    }

    console.log(`   ✅ Found ${publicProps?.length || 0} public properties\n`);

    if (publicProps && publicProps.length > 0) {
      console.log('📋 Public Properties:');
      publicProps.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.property_number}`);
        console.log(`      ${prop.address}`);
        console.log(`      ${prop.price}万円 - ${prop.property_type}`);
        console.log('');
      });
    }

    console.log('✅ Test properties created successfully!\n');
    console.log('🌐 You can now view them at:');
    console.log('   http://localhost:5174/public/properties\n');

  } catch (error) {
    console.error('\n❌ Failed to create test properties:', error);
    throw error;
  }
}

createTestProperties().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
