import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13527_2WorkTasks() {
  console.log('🔍 Checking AA13527-2 in work_tasks table...\n');
  
  // work_tasksテーブルを確認
  const { data: workTask, error } = await supabase
    .from('work_tasks')
    .select('*')
    .eq('property_number', 'AA13527-2')
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      console.log('❌ AA13527-2 NOT FOUND in work_tasks table');
      console.log('\n📋 This means:');
      console.log('   - No spreadsheet_url available');
      console.log('   - Comment sync will NOT run automatically');
      console.log('   - Need to add to work_tasks table first');
    } else {
      console.error('Error:', error);
    }
    return;
  }
  
  console.log('✅ AA13527-2 FOUND in work_tasks table\n');
  console.log('📊 Work Task Data:');
  console.log('   property_number:', workTask.property_number);
  console.log('   spreadsheet_url:', workTask.spreadsheet_url || '❌ NULL');
  console.log('   storage_url:', workTask.storage_url || 'NULL');
  console.log('   created_at:', workTask.created_at);
  
  if (!workTask.spreadsheet_url) {
    console.log('\n⚠️  spreadsheet_url is NULL');
    console.log('   - Comment sync will NOT run');
    console.log('   - Need to add spreadsheet_url to work_tasks');
  } else {
    console.log('\n✅ spreadsheet_url exists');
    console.log('   - Comment sync will run automatically (Phase 4.7)');
    console.log('   - Next sync: within 5 minutes');
  }
  
  // property_detailsテーブルも確認
  console.log('\n🔍 Checking property_details table...\n');
  const { data: details, error: detailsError } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', 'AA13527-2')
    .single();
  
  if (detailsError) {
    if (detailsError.code === 'PGRST116') {
      console.log('❌ AA13527-2 NOT FOUND in property_details table');
      console.log('   - Will be created during next sync');
    } else {
      console.error('Error:', detailsError);
    }
  } else {
    console.log('✅ AA13527-2 FOUND in property_details table\n');
    console.log('📊 Property Details:');
    console.log('   property_about:', details.property_about ? '✅ EXISTS' : '❌ NULL');
    console.log('   favorite_comment:', details.favorite_comment ? '✅ EXISTS' : '❌ NULL');
    console.log('   recommended_comments:', details.recommended_comments ? '✅ EXISTS' : '❌ NULL');
    console.log('   panorama_url:', details.panorama_url ? '✅ EXISTS' : '❌ NULL');
  }
}

checkAA13527_2WorkTasks().catch(console.error);
