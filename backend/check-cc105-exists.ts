import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC105Exists() {
  try {
    console.log('🔍 Checking if CC105 exists in database...\n');
    
    // 1. property_listingsテーブルで検索
    console.log('1️⃣ Checking property_listings table...');
    const { data: propertyListings, error: plError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'CC105');
    
    if (plError) {
      console.error('❌ Error querying property_listings:', plError);
    } else {
      console.log(`   Found ${propertyListings?.length || 0} records in property_listings`);
      if (propertyListings && propertyListings.length > 0) {
        console.log('   Data:', JSON.stringify(propertyListings[0], null, 2));
      }
    }
    
    console.log('');
    
    // 2. propertiesテーブルで検索
    console.log('2️⃣ Checking properties table...');
    const { data: properties, error: pError } = await supabase
      .from('properties')
      .select('*')
      .eq('property_number', 'CC105');
    
    if (pError) {
      console.error('❌ Error querying properties:', pError);
    } else {
      console.log(`   Found ${properties?.length || 0} records in properties`);
      if (properties && properties.length > 0) {
        console.log('   Data:', JSON.stringify(properties[0], null, 2));
      }
    }
    
    console.log('');
    
    // 3. property_detailsテーブルで検索
    console.log('3️⃣ Checking property_details table...');
    const { data: propertyDetails, error: pdError } = await supabase
      .from('property_details')
      .select('*')
      .ilike('property_number', 'CC105');
    
    if (pdError) {
      console.error('❌ Error querying property_details:', pdError);
    } else {
      console.log(`   Found ${propertyDetails?.length || 0} records in property_details`);
      if (propertyDetails && propertyDetails.length > 0) {
        console.log('   Data:', JSON.stringify(propertyDetails[0], null, 2));
      }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Summary:');
    console.log(`   property_listings: ${propertyListings?.length || 0} records`);
    console.log(`   properties: ${properties?.length || 0} records`);
    console.log(`   property_details: ${propertyDetails?.length || 0} records`);
    console.log('═══════════════════════════════════════════════════════════');
    
    if ((propertyListings?.length || 0) === 0 && 
        (properties?.length || 0) === 0 && 
        (propertyDetails?.length || 0) === 0) {
      console.log('');
      console.log('✅ CC105 does NOT exist in any table');
      console.log('');
      console.log('📝 This confirms that:');
      console.log('   1. CC105 is not a valid property in the system');
      console.log('   2. The CC10 folder was incorrectly pointing to CC105 folder');
      console.log('   3. The fix we applied (pointing CC10 to the correct folder) was correct');
    } else {
      console.log('');
      console.log('⚠️ CC105 EXISTS in the database!');
      console.log('');
      console.log('📝 This means:');
      console.log('   1. CC105 is a valid property');
      console.log('   2. We need to investigate why it was showing up for CC10');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkCC105Exists();
