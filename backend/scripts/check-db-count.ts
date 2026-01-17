import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkDatabaseCount() {
  console.log('🔍 Checking database count...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  console.log(`📊 Supabase URL: ${supabaseUrl}`);
  console.log(`📊 Using SERVICE_KEY: ${supabaseKey?.substring(0, 20)}...\n`);
  
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  // Count all properties
  const { count, error } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`✅ Total properties in database: ${count}`);
  
  // Get first 10 property numbers
  const { data, error: dataError } = await supabase
    .from('property_listings')
    .select('property_number, address')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (dataError) {
    console.error('❌ Error fetching data:', dataError);
    return;
  }
  
  console.log('\n📋 First 10 properties:');
  data?.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.property_number} - ${p.address || 'No address'}`);
  });
  
  // Search for AA10424
  const { data: aa10424, error: searchError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA10424')
    .single();
  
  if (searchError) {
    if (searchError.code === 'PGRST116') {
      console.log('\n❌ AA10424 NOT FOUND in database');
    } else {
      console.error('\n❌ Error searching for AA10424:', searchError);
    }
  } else {
    console.log('\n✅ AA10424 FOUND:');
    console.log(JSON.stringify(aa10424, null, 2));
  }
}

checkDatabaseCount().catch(console.error);
