import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .envファイルを読み込む（backendディレクトリから）
dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStorageLocationSync() {
  console.log('🔍 Checking storage_location sync status...\n');

  // サンプル物件を取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url')
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 Sample properties:');
  console.log('Total:', properties.length);
  
  let nullCount = 0;
  let hasDataCount = 0;
  
  properties.forEach(p => {
    if (!p.storage_location) {
      nullCount++;
      console.log(`  ❌ ${p.property_number}: storage_location is NULL`);
    } else {
      hasDataCount++;
      console.log(`  ✅ ${p.property_number}: ${p.storage_location.substring(0, 50)}...`);
    }
  });
  
  console.log('\n📈 Summary:');
  console.log(`  NULL: ${nullCount}`);
  console.log(`  Has Data: ${hasDataCount}`);
  
  // 全体の統計を取得
  const { count: totalCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });
  
  const { count: nullStorageCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .is('storage_location', null);
  
  console.log('\n📊 Overall Statistics:');
  console.log(`  Total Properties: ${totalCount}`);
  console.log(`  NULL storage_location: ${nullStorageCount}`);
  console.log(`  Has storage_location: ${(totalCount || 0) - (nullStorageCount || 0)}`);
}

checkStorageLocationSync();
