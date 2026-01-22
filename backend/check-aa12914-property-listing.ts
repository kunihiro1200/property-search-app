import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkAA12914PropertyListing() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    console.log('Checking AA12914 in property_listings table...\n');
    
    const { data, error } = await supabase
      .from('property_listings')
      .select('id, property_number, address, storage_location, image_url, atbb_status')
      .eq('property_number', 'AA12914')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ AA12914 not found in property_listings table');
        console.log('   This property needs to be added to the database.');
        return;
      }
      throw new Error(`Supabase query error: ${error.message}`);
    }
    
    console.log('✅ Found AA12914 in property_listings table\n');
    console.log('Property data:');
    console.log('- ID:', data.id);
    console.log('- Property Number:', data.property_number);
    console.log('- Address:', data.address);
    console.log('- ATBB Status:', data.atbb_status);
    console.log('- Has image_url:', !!data.image_url);
    console.log('- Has storage_location:', !!data.storage_location);
    
    if (data.storage_location) {
      console.log('- Storage Location:', data.storage_location);
    }
    
    if (!data.storage_location) {
      console.log('\n⚠️  storage_location is NULL');
      console.log('   This property will not display images in the public site.');
      console.log('   Expected storage_location: https://drive.google.com/drive/u/0/folders/1WCwCm1Y1jTu5XDyqucrdQEiSNU1s3v9G');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkAA12914PropertyListing();
