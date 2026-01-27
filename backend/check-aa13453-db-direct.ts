import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://krxhrbtlgfjzsseegaqq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeGhyYnRsZ2ZqenNzZWVnYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAyMTQxMSwiZXhwIjoyMDc4NTk3NDExfQ.nog3UX9J9OgfqlCIPJt_sU_exE6Ny-nSj_HmwgV3oA8';

async function checkAA13453() {
  console.log('🔍 Checking AA13453 in database...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // property_listingsテーブルを確認
  console.log('📋 Checking property_listings table...');
  const { data: propertyListing, error: plError } = await supabase
    .from('property_listings')
    .select('property_number, address, price, atbb_status, created_at, updated_at, last_synced_at')
    .eq('property_number', 'AA13453')
    .maybeSingle();

  if (plError) {
    console.error('❌ Error:', plError.message);
  } else if (propertyListing) {
    console.log('✅ AA13453 FOUND in property_listings:');
    console.log(JSON.stringify(propertyListing, null, 2));
  } else {
    console.log('❌ AA13453 NOT FOUND in property_listings');
  }

  console.log('\n📊 Latest 10 properties in database:');
  const { data: latest, error: latestError } = await supabase
    .from('property_listings')
    .select('property_number, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (latestError) {
    console.error('❌ Error:', latestError.message);
  } else if (latest) {
    latest.forEach((prop, i) => {
      console.log(`   ${i + 1}. ${prop.property_number} (${prop.created_at})`);
    });
  }

  console.log('\n📊 Total property count:');
  const { count, error: countError } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error:', countError.message);
  } else {
    console.log(`   Total: ${count} properties`);
  }
}

checkAA13453();
