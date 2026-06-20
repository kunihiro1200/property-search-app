/**
 * データベースのstorage_locationを確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkStorageLocation() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔍 Checking storage_location in database...\n');

  // 最新の10件を取得
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 Latest 10 properties:\n');
  data?.forEach((property) => {
    console.log(`${property.property_number}:`);
    console.log(`  storage_location: ${property.storage_location || '(null)'}`);
    console.log(`  updated_at: ${property.updated_at}`);
    console.log('');
  });

  // storage_locationがnullの件数を確認
  const { count: nullCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .is('storage_location', null);

  const { count: totalCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Summary:`);
  console.log(`  Total properties: ${totalCount}`);
  console.log(`  Properties with storage_location: ${(totalCount || 0) - (nullCount || 0)}`);
  console.log(`  Properties without storage_location: ${nullCount}`);
}

checkStorageLocation();
