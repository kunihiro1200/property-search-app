import { createClient } from '@supabase/supabase-js';

async function checkAA13453() {
  console.log('🔍 Checking AA13453 in database...\n');

  // 環境変数を直接読み込む
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables');
    console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

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

  console.log('\n📊 Latest 5 properties:');
  const { data: latest, error: latestError } = await supabase
    .from('property_listings')
    .select('property_number, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (latestError) {
    console.error('❌ Error:', latestError.message);
  } else if (latest) {
    latest.forEach((prop, i) => {
      console.log(`${i + 1}. ${prop.property_number} (${prop.created_at})`);
    });
  }
}

checkAA13453();
