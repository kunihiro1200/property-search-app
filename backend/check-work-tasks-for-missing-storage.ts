import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkWorkTasksForMissingStorage() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const propertyNumbers = ['CC5', 'CC20', 'CC16', 'AA13341', 'AA12595'];

  try {
    console.log('Checking work_tasks for missing storage_location...\n');
    
    for (const propertyNumber of propertyNumbers) {
      console.log(`Checking ${propertyNumber}:`);
      
      const { data, error } = await supabase
        .from('work_tasks')
        .select('property_number, storage_url')
        .eq('property_number', propertyNumber)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`   ❌ No work_task found`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      } else if (data) {
        if (data.storage_url) {
          console.log(`   ✅ Found storage_url: ${data.storage_url}`);
        } else {
          console.log(`   ⚠️  work_task exists but storage_url is null`);
        }
      }
      console.log('');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkWorkTasksForMissingStorage();
