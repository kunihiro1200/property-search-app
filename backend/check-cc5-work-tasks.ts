import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkCC5WorkTasks() {
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
  
  // 他の物件も確認
  console.log('\n🔍 Checking work_tasks for first 5 properties...');
  const { data: allData, error: allError } = await supabase
    .from('work_tasks')
    .select('property_number, storage_url')
    .limit(5);
  
  if (allError) {
    console.error('❌ Error:', allError.message);
  } else {
    console.log('✅ Found work_tasks:');
    allData?.forEach(task => {
      console.log(`   ${task.property_number}: ${task.storage_url ? 'HAS URL' : 'NO URL'}`);
    });
  }
}

checkCC5WorkTasks().catch(console.error);
