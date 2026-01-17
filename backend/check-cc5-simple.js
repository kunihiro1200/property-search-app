const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCC5() {
  console.log('🔍 Checking work_tasks for CC5...');
  
  const { data, error } = await supabase
    .from('work_tasks')
    .select('property_number, storage_url')
    .eq('property_number', 'CC5')
    .single();
  
  if (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'PGRST116') {
      console.log('⚠️ No work_task found for CC5');
    }
  } else {
    console.log('✅ Found work_task for CC5:');
    console.log('   property_number:', data.property_number);
    console.log('   storage_url:', data.storage_url);
  }
  
  // property_listingsテーブルも確認
  console.log('\n🔍 Checking property_listings for CC5...');
  const { data: propData, error: propError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url')
    .eq('property_number', 'CC5')
    .single();
  
  if (propError) {
    console.error('❌ Error:', propError.message);
  } else {
    console.log('✅ Found property_listing for CC5:');
    console.log('   property_number:', propData.property_number);
    console.log('   storage_location:', propData.storage_location);
    console.log('   image_url:', propData.image_url);
  }
}

checkCC5().catch(console.error);
