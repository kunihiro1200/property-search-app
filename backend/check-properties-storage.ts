// 複数の物件のstorage_locationとstorage_urlを確認
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkPropertiesStorage() {
  console.log('=== 物件のstorage_location/storage_urlを確認 ===\n');

  const propertyNumbers = ['AA18', 'AA5564', 'AA13149', 'AA214', 'AA13129'];

  for (const propertyNumber of propertyNumbers) {
    console.log(`\n--- ${propertyNumber} ---`);

    // property_listingsから取得
    const { data: property } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location')
      .eq('property_number', propertyNumber)
      .single();

    if (property) {
      console.log(`property_listings.storage_location: ${property.storage_location || '(なし)'}`);
    } else {
      console.log('property_listingsに見つかりません');
    }

    // work_tasksから取得
    const { data: workTask } = await supabase
      .from('work_tasks')
      .select('id, property_number, storage_url')
      .eq('property_number', propertyNumber)
      .single();

    if (workTask) {
      console.log(`work_tasks.storage_url: ${workTask.storage_url || '(なし)'}`);
    } else {
      console.log('work_tasksに見つかりません');
    }
  }

  console.log('\n=== 確認完了 ===');
}

checkPropertiesStorage();
