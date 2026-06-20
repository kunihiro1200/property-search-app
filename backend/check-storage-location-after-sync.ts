/**
 * 同期後のstorage_locationの状態を確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStorageLocation() {
  console.log('🔍 Checking storage_location after sync...\n');

  // 最初の10件を確認
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, spreadsheet_url')
    .order('property_number')
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 First 10 properties:');
  properties?.forEach((prop) => {
    console.log(`\n${prop.property_number}:`);
    console.log(`  storage_location: ${prop.storage_location || 'NULL'}`);
    console.log(`  spreadsheet_url: ${prop.spreadsheet_url || 'NULL'}`);
  });

  // storage_locationがnullの件数を確認
  const { count: nullCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .is('storage_location', null);

  // storage_locationがある件数を確認
  const { count: notNullCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('storage_location', 'is', null);

  console.log('\n📊 Summary:');
  console.log(`  storage_location NULL: ${nullCount}`);
  console.log(`  storage_location NOT NULL: ${notNullCount}`);
}

checkStorageLocation().catch(console.error);
