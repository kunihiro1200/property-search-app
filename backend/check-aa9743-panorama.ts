import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

async function checkPanorama() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 AA9743のパノラマURL確認\n');

  // property_listingsテーブルを確認
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('property_number, panorama_url')
    .eq('property_number', 'AA9743')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('✅ 物件情報:');
  console.log(`  物件番号: ${property.property_number}`);
  console.log(`  パノラマURL: ${property.panorama_url || '(未設定)'}`);
}

checkPanorama().catch(console.error);
