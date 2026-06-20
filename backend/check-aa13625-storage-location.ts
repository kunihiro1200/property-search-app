import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAA13625() {
  console.log('🔍 Checking AA13625 storage_location...\n');

  // AA13625の物件データを取得
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url, atbb_status')
    .eq('property_number', 'AA13625')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!property) {
    console.log('❌ Property AA13625 not found');
    return;
  }

  console.log('📊 AA13625 Data:');
  console.log('  Property Number:', property.property_number);
  console.log('  ATBB Status:', property.atbb_status);
  console.log('  Storage Location:', property.storage_location || 'NULL');
  console.log('  Image URL:', property.image_url || 'NULL');

  if (!property.storage_location) {
    console.log('\n❌ storage_location is NULL');
    console.log('📝 This is why images are not displayed');
  } else {
    console.log('\n✅ storage_location exists');
  }
}

checkAA13625();
