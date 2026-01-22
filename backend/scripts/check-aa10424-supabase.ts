import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkAA10424Supabase() {
  console.log('🔍 Checking AA10424 using Supabase client (SERVICE_KEY)...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  try {
    // まず、テーブルのカラム情報を確認
    console.log('📋 Checking table columns...');
    const { data: columns, error: columnsError } = await supabase
      .from('property_listings')
      .select('*')
      .limit(1);
    
    if (columnsError) {
      console.error('❌ Error fetching columns:', columnsError);
      return;
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Available columns:', Object.keys(columns[0]).join(', '));
      console.log('');
    }
    
    // AA10424を検索
    console.log('🔍 Searching for AA10424...');
    const { data, error } = await supabase
      .from('property_listings')
      .select('property_number, address, latitude, longitude, google_map_url')
      .eq('property_number', 'AA10424')
      .single();
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (!data) {
      console.log('❌ AA10424 not found');
      return;
    }
    
    console.log('📊 AA10424 Data:');
    console.log(`  Property Number: ${data.property_number}`);
    console.log(`  Address: ${data.address}`);
    console.log(`  Latitude: ${data.latitude || 'NULL'}`);
    console.log(`  Longitude: ${data.longitude || 'NULL'}`);
    console.log(`  Google Map URL: ${data.google_map_url || 'NULL'}`);
    
    if (!data.latitude || !data.longitude) {
      console.log('\n⚠️ Coordinates are NULL - need to geocode!');
      if (data.google_map_url) {
        console.log('📍 Google Map URL exists, we can extract coordinates from it.');
      }
    } else {
      console.log('\n✅ Coordinates are already set!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAA10424Supabase().catch(console.error);
