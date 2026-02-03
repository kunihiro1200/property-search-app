import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13527_2PropertyDetails() {
  console.log('🔍 Checking AA13527-2 property_details...\n');
  
  // property_detailsテーブルを確認
  const { data: details, error } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', 'AA13527-2')
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      console.log('❌ AA13527-2 NOT FOUND in property_details table');
      console.log('   - Comment sync has NOT run yet');
    } else {
      console.error('Error:', error);
    }
    return;
  }
  
  console.log('✅ AA13527-2 FOUND in property_details table\n');
  console.log('📊 Comment Data Status:');
  console.log('   property_about:', details.property_about ? `✅ EXISTS (${details.property_about.substring(0, 50)}...)` : '❌ NULL');
  console.log('   favorite_comment:', details.favorite_comment ? `✅ EXISTS (${details.favorite_comment.substring(0, 50)}...)` : '❌ NULL');
  console.log('   recommended_comments:', details.recommended_comments ? `✅ EXISTS (${JSON.stringify(details.recommended_comments).substring(0, 50)}...)` : '❌ NULL');
  console.log('   panorama_url:', details.panorama_url ? `✅ EXISTS (${details.panorama_url})` : '❌ NULL');
  console.log('   athome_data:', details.athome_data ? `✅ EXISTS` : '❌ NULL');
  console.log('\n   created_at:', details.created_at);
  console.log('   updated_at:', details.updated_at);
}

checkAA13527_2PropertyDetails().catch(console.error);
