import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkSchema() {
  console.log('🔍 Checking property_listings table schema...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1件のデータを取得してカラム名を確認
  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data) {
    console.log('❌ No data found in property_listings table');
    return;
  }

  console.log('📋 property_listings table columns:');
  Object.keys(data).forEach(key => {
    console.log(`  - ${key}`);
  });
}

checkSchema().catch(console.error);
